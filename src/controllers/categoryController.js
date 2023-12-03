const mongoose = require("mongoose");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

const Project = require("./../models/projectModel");
const User = require("./../models/userModel");
const Attribute = require("./../models/attributeModel");
const CategoryData = require("./../models/categoryDataModel");
const Category = require("./../models/categoryModel");
const Collaborator = require("./../models/collaboratorModel");
const Permission = require("../models/permissionModel");

///////// ยังไม่มีการ check collaboration permission

/**
 * @desc check wheather input id is valid mongodb objectID
 * @param {String} id that want to check
 * @return {Boolean} return true if inpur is valid mongodb;otherwise false
 */
const isValidObjectId = (id) => {
  if (mongoose.isValidObjectId(id)) return true;
  return false;
};

const compareId = (id1, id2) => {
  return id1.toString() === id2.toString();
};

const checkCollab = async (next, projectId, userId, message, ...permission) => {
  // Check permission wheather use has permission to create new phase
  const projectCollab = await Collaborator.findOne({
    projectId,
    userId,
  });

  if (!projectCollab)
    return next(
      new AppError("You do not have permission to access this project.", 403)
    );
  const permissionIds = await Permission.find({ name: { $in: permission } });

  for (let i = 1; i < permissionIds; ++i) {
    if (compareId(permissionIds[0]._id, projectCollab.permissionId)) break;
    if (i === permissionIds.length) return next(new AppError(message, 401));
  }
};

/**
 * @desc paginate array by page_size and page_number
 * @param {Array} array any array
 * @param {Number} page_size object per page
 * @param {Number} page_number skip to which page
 * @returns return paginated array
 */
const paginate = (array, page_size, page_number) => {
  // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
  return array.slice((page_number - 1) * page_size, page_number * page_size);
};

exports.createCategory = catchAsync(async (req, res, next) => {
  const projectId = req.params.projectId;
  if (!isValidObjectId(projectId))
    return next(new AppError("Invalid projectId", 400));

  // Check wheather project exist
  const testProject = await Project.findById(projectId);
  if (!testProject) return next(new AppError("Project not exist.", 404));

  // Check permission wheather use has permission to create new phase
  checkCollab(
    next,
    projectId,
    req.user._id,
    "You do not have permission to create a new category.",
    "owner",
    "can_edited"
  );

  // Check all required input
  if (!req.body.name || !req.body.mainAttributeName)
    return next(
      new AppError("Category required name and mainAttributename", 400)
    );

  //   Check duplicate category in project
  const testCategory = await Category.findOne({
    projectId: projectId,
    name: req.body.name,
  });

  if (testCategory)
    return next(new AppError("Category name cannot be the same", 400));

  // Create category
  const newCategory = await Category.create({
    projectId,
    name: req.body.name,
    createdAt: Date.now(),
    createdBy: req.user._id,
    editedAt: Date.now(),
    editedBy: req.user._id,
  });

  // Create mainAttribute
  const mainAttribute = await Attribute.create({
    categoryId: newCategory._id,
    name: req.body.mainAttributeName,
    type: "String",
    positionInCategory: 0,
    createdAt: Date.now(),
    createdBy: req.user._id,
    editedAt: Date.now(),
    editedBy: req.user._id,
  });
  // Create otherAttribute
  let attributePosition = 1;
  for (const attribute of req.body.otherAttribute) {
    // Check for all required input
    if (!attribute.name || !attribute.type)
      return next(new AppError("Otherattribute require name and type", 400));
    const doc = {
      name: attribute.name,
      type: attribute.type,
      categoryId: newCategory._id,
      positionInCategory: attributePosition,
      createdAt: Date.now(),
      createdBy: req.user._id,
      editedAt: Date.now(),
      editedBy: req.user._id,
    };
    if (attribute.parentCategoryId) {
      if (!isValidObjectId(attribute.parentCategoryId))
        return next(new AppError("Invalid parentCategoryId", 400));
      // Check if parentCategory exist
      const testParentCategory = await Category.findById(
        attribute.parentCategoryId
      );
      if (!testParentCategory)
        return next(new AppError("Parent Category not exist", 401));
      doc["parentCategoryId"] = attribute.parentCategoryId;
    }
    const newAttribute = await Attribute.create(doc);
    attributePosition++;
  }

  res.status(201).json();
});

exports.getName = catchAsync(async (req, res, next) => {
  const projectId = req.params.projectId;
  if (!isValidObjectId(projectId))
    return next(new AppError("Invalid projectId", 401));

  checkCollab(
    next,
    projectId,
    req.user._id,
    "You don't have permission to viewed project category.",
    "can_edited",
    "can_viewed"
  );

  // Check wheather project exist
  const testProject = await Project.findById(projectId);
  if (!testProject) return next(new AppError("Project not exist.", 401));

  const categories = await Category.aggregate([
    {
      $match: { projectId: new mongoose.Types.ObjectId(req.params.projectId) },
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        name: "$name",
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: categories,
  });
});

exports.edited = catchAsync(async (req, res, next) => {
  const categoryId = req.params.categoryId;
  if (!isValidObjectId(categoryId))
    return next(new AppError("Invalid categoryId", 401));

  // Check wheather category exist

  const testCategory = await Category.findById(categoryId);
  if (!testCategory) return next(new AppError("Category not exist", 401));

  // Check permission wheather use has permission to create new phase
  checkCollab(
    next,
    testCategory.projectId,
    req.user._id,
    "You do not have permission to create a new category.",
    "can_edited"
  );

  // Category
  const testCategoryName = await Category.findOne({
    projectId: testCategory.projectId,
    name: req.body.name,
  });
  if (testCategoryName && !compareId(testCategory._id, categoryId))
    return next(new AppError("Duplicate Category name", 401));

  const editedCategory = await Category.findOneAndUpdate(
    {
      categoryId: testCategory._id,
    },
    {
      name: req.body.name,
      description: req.body.description,
      editedBy: req.user._id,
      editedAt: Date.now(),
    }
  );

  // Check all required input
  if (!req.body.name || !req.body.mainAttributeName)
    return next(
      new AppError("Category required name and mainAttributename", 401)
    );

  // Check if all attribute has unique name
  const attributeName = [];
  attributeName.push(req.body.mainAttributeName);
  for (const otherAttribute of req.body.otherAttribute) {
    if (!otherAttribute.name)
      return next(new AppError("Attribute required name", 401));
    attributeName.push(otherAttribute.name);
  }

  if (
    !attributeName.every((value, index, array) => {
      return array.indexOf(value) === array.lastIndexOf(value);
    })
  )
    return next(new AppError("Every attribute name must be unique", 401));

  // MainAttribute

  const testMainAttribute = await Attribute.findOne({
    categoryId,
    name: req.body.mainAttributeName,
  });

  if (testMainAttribute && testMainAttribute.positionInCategory !== 0)
    return next(new AppError("Duplicate attribute name", 401));

  const mainAttribute = await Attribute.findOneAndUpdate(
    {
      categoryId,
      positionInCategory: 0,
    },
    {
      name: req.body.mainAttributeName,
      editedAt: Date.now(),
      editedBy: req.user._id,
    }
  );

  // Other Attribute
  let attributePosition = 1;
  for (const otherAttribute of req.body.otherAttribute) {
    if (!otherAttribute.id) {
      // New Attribute
      // Check for all required input
      if (!otherAttribute.name || !otherAttribute.type)
        return next(new AppError("Otherattribute require name and type", 401));
      const doc = {
        name: otherAttribute.name,
        type: otherAttribute.type,
        categoryId,
        positionInCategory: attributePosition,
        createdAt: Date.now(),
        createdBy: req.user._id,
        editedAt: Date.now(),
        editedBy: req.user._id,
      };
      if (otherAttribute.parentCategoryId) {
        if (!isValidObjectId(otherAttribute.parentCategoryId))
          return next(new AppError("Invalid parentCategoryId", 401));
        // Check if parentCategory exist
        const testParentCategory = await Category.findById(
          otherAttribute.parentCategoryId
        );
        if (!testParentCategory)
          return next(new AppError("Parent Category not exist", 401));
        doc["parentCategoryId"] = otherAttribute.parentCategoryId;
      }
      const newAttribute = await Attribute.create(doc);
    } else {
      // Old attribute
      // Check for all required input
      if (!otherAttribute.name)
        return next(new AppError("Otherattribute require name", 401));

      if (!isValidObjectId(otherAttribute.id))
        return next(new AppError("Invalid attributeid", 401));

      const testAttribute = await Attribute.findById(otherAttribute.id);
      if (!testAttribute) return next(new AppErrro("Attribute not exist", 401));

      const editedAttribute = await Attribute.findOneAndUpdate(
        {
          _id: otherAttribute.id,
        },
        {
          name: otherAttribute.name,
          positionInCategory: attributePosition,
          editedAt: Date.now(),
          editedBy: req.user._id,
        }
      );
    }
    attributePosition++;
  }

  res.status(204).json();
});

exports.createEntry = catchAsync(async (req, res, next) => {
  const categoryId = req.params.categoryId;
  if (!isValidObjectId(categoryId))
    return next(new AppError("Invalid categoryId", 401));

  const testCategory = await Category.findById(categoryId);
  if (!testCategory) return next(new AppError("Categort not exist", 401));

  checkCollab(
    next,
    testCategory.projectId,
    req.user._id,
    "You don't have permission to viewed project category.",
    "can_edited"
  );

  // Check all input validation
  const attributeDatas = [];

  for (const attributeData of req.body) {
    // Check attribute existense
    if (!attributeData.name)
      return next(new AppError("Required attribute name", 401));

    const testAttribute = await Attribute.findOne({ name: attributeData.name });
    if (!testAttribute) return next(new AppError("Attribute not found", 401));
    if (testAttribute.type === "Category reference") {
    }
    attributeDatas.push({
      attributeId: testAttribute._id,
      data: attributeData.value,
    });
  }

  const newCategoryData = await CategoryData.create({
    categoryId,
    data: attributeDatas,
    createdAt: Date.now(),
    createdBy: req.user._id,
    editedAt: Date.now(),
    editedBy: req.user._id,
  });

  res.status(201).json();
});

exports.getEntry = catchAsync(async (req, res, next) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const categoryId = req.params.categoryId;
  if (!isValidObjectId(categoryId))
    return next(new AppError("Invalid projectId", 401));
  const testCategory = await Category.findById(categoryId);
  if (!testCategory) return next(new AppError("Category not exist", 401));
  checkCollab(
    next,
    testCategory.projectId,
    req.user._id,
    "You don't have permission to viewed project category.",
    "can_edited",
    "can_viewed"
  );
  const category = await Category.findById(categoryId);

  const mainAttribute = await Attribute.findOne({
    categoryId,
    positionInCategory: 0,
  });

  const otherAttribute = await Attribute.aggregate([
    {
      $match: {
        categoryId: new mongoose.Types.ObjectId(categoryId),
        positionInCategory: { $gte: 1 },
      },
    },
    {
      $sort: { positionInCategory: 1 },
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        name: "$name",
        type: "$type",
        parentCategoryId: "$parentCategoryId",
      },
    },
  ]);

  const categoryDatas = await CategoryData.aggregate([
    {
      $match: { categoryId: new mongoose.Types.ObjectId(categoryId) },
    },
    {
      $sort: { createdAt: 1 },
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        data: "$data",
      },
    },
  ]);

  let attributeEntry = [];
  for (const entry of categoryDatas) {
    const doc = {};
    for (const data of entry.data) {
      const attribute = await Attribute.findById(data.attributeId);
      if (!attribute) return next(new AppError("Attribute not found", 401));
      if (attribute.type === "Category reference") {
        const parentDoc = {};
        const parentCategory = await CategoryData.findById(data.data);
        if (parentCategory) {
          parentDoc[`parentCategoryId`] = parentCategory.categoryId;
          parentDoc[`data`] = parentCategory.data[0].data;
        }
        doc[`${attribute.name}`] = parentDoc;
      } else {
        doc[`${attribute.name}`] = data.data;
      }
    }
    doc["id"] = entry.id;
    attributeEntry.push(doc);
  }

  attributeEntry = paginate(attributeEntry, limit, page);
  res.status(200).json({
    status: "success",
    data: {
      name: category.name,
      mainAttribute: mainAttribute.name,
      otherAttribute,
      attributeEntry,
    },
  });
});

exports.editedEntry = catchAsync(async (req, res, next) => {
  const entryId = req.params.entryId;
  if (!isValidObjectId(entryId)) return next(new AppError("Invalid entryId"));

  const testEntry = await CategoryData.findById(entryId);
  if (!testEntry) return next(new AppError("Entry not exist", 401));
  const testCategory = await Category.findById(testEntry.categoryId);
  if (!testCategory) return next(new AppError("Category not exist", 401));
  checkCollab(
    next,
    testCategory.projectId,
    req.user._id,
    "You don't have permission to viewed project category.",
    "can_edited"
  );
  const newDatas = [];
  let i = 0;
  for (const newData of req.body) {
    testEntry.data[i].data = newData.value;
    i++;
  }

  testEntry.editedAt = Date.now();
  testEntry.editedBy = req.user._id;

  testEntry.save();

  res.status(204).json();
});
