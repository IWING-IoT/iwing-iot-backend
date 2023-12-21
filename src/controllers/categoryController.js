const mongoose = require("mongoose");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const checkCollab = require("../utils/checkCollab");

const Project = require("../models/projectModel");
const User = require("../models/userModel");

const Category = require("../models/categoryModel");
const Collaborator = require("../models/collaboratorModel");
const Permission = require("../models/permissionModel");
const Attribute = require("../models/attributeModel");
const AttributeValue = require("../models/attributeValueModel");
const CategoryEntity = require("../models/categoryEntityModel");

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

// POST /api/project/:projectId/category (testing)
exports.createCategory = catchAsync(async (req, res, next) => {
  await checkCollab(
    next,
    req.params.projectId,
    req.user.id,
    "You do not have permission to create a new category.",
    "can_edit",
    "owner"
  );

  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 400));

  const testProject = await Project.findById(req.params.projectId);
  if (!testProject) return next(new AppError("Project not found", 404));

  if (!req.body.name || !req.body.mainAttribute)
    return next(new AppError("Invalid input", 400));

  const testCategory = await Category.findOne({ name: req.body.name });
  if (testCategory) return next(new AppError("Duplicate category name", 400));

  // Create category
  const createCategory = await Category.create({
    name: req.body.name,
    description: req.body.description ? req.body.description : "",
    projectId: req.params.projectId,
    createdAt: Date.now(),
    createdBy: req.user.id,
  });

  // Create Attribute
  // Main
  const mainAttribute = await Attribute.create({
    categoryId: createCategory._id,
    name: req.body.mainAttribute,
    type: "string",
    position: 0,
    createdAt: Date.now(),
    createdBy: req.user.id,
  });
  // Others
  let position = 1;
  for (const attribute of req.body.otherAttribute) {
    let tempAttribute = {
      categoryId: createCategory._id,
      position,
      createdAt: Date.now(),
      createdBy: req.user.id,
    };

    if (!attribute.name || !attribute.type)
      return next(new AppError("Invalid input", 400));
    tempAttribute["name"] = attribute.name;
    tempAttribute["type"] = attribute.type;

    if (attribute.type === "category_reference") {
      if (!isValidObjectId(attribute.referenceFrom))
        return next(new AppError("Invalid parentId", 400));

      const testParentCategory = await Category.findById(
        attribute.referenceFrom
      );
      if (!testParentCategory)
        return next(new AppError("Parent Categroy not found", 404));

      tempAttribute["parentCategoryId"] = attribute.referenceFrom;
    }

    const createAttribute = await Attribute.create(tempAttribute);
    position++;
  }

  res.status(201).json();
});

// GET /api/project/:projectId/category (testing)
exports.getCategories = catchAsync(async (req, res, next) => {
  await checkCollab(
    next,
    req.params.projectId,
    req.user.id,
    "You do not have permission to create a new category.",
    "can_edit",
    "owner",
    "can_view"
  );

  if (!isValidObjectId(req.params.categoryId))
    return next(new AppError("Invalid categoryId", 400));

  const testProject = await Project.findById(req.params.projectId);
  if (!testProject) return next(new AppError("Project not found", 404));

  const categories = await Category.aggregate([
    {
      $match: {
        projectId: new mongoose.Types.ObjectId(req.params.projectId),
      },
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: categories,
  });
});

// GET /api/category/:categoryId (testing)
exports.getCategoryEntry = catchAsync(async (req, res, next) => {
  await checkCollab(
    next,
    req.params.projectId,
    req.user.id,
    "You do not have permission to create a new category.",
    "can_edit",
    "owner",
    "can_view"
  );

  if (isValidObjectId(req.params.categoryId))
    return next(new AppError("Invalid categoryId", 400));

  const testCategory = await Category.findById(req.params.categoryId);
  if (!testCategory) return next(new AppError("Category not found", 404));

  // Get category metadata

  const formatOutput = {
    name: testCategory.name,
    description: testCategory.description,
  };

  const otherAttribute = await Attribute.aggregate([
    {
      $match: {
        categoryId: new mongoose.Types.ObjectId(req.params.categoryId),
      },
    },
    {
      $sort: {
        position: 1,
      },
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        accessorKey: "$name",
        type: 1,
      },
    },
  ]);

  const mainAttribute = otherAttribute.shift();

  formatOutput["mainAttribute"] = mainAttribute.name;
  formatOutput["entryDefinitions"] = otherAttribute;

  // Get category entry

  const entries = await CategoryEntity.find({
    categoryId: req.params.categoryId,
  });

  const attributeEntries = [];
  // ค่อย optimize
  // Loop each entry row
  for (const entry of entries) {
    const formatEntry = { id: entry._id };
    const attributeValues = await AttributeValue.find({
      categoryEntityId: entry._id,
    });
    // Loop each data in each row
    for (const attributeValue of attributeValues) {
      const attribute = await Attribute.findById(attributeValue.attributeId);
      if (!attribute) return next(new AppError("Attribute not found", 404));
      if (attribute.type === "category_reference") {
        if (!isValidObjectId(attributeValue.value))
          return next(new AppError("Invalid something", 400));

        const testParentEntry = await CategoryEntity.findById(
          attributeValue.value
        );
        if (!testParentEntry)
          return next(new AppError("Parent Data not found", 404));

        const testmainAttributeParent = await Attribute.findOne({
          position: 0,
          categoryId: testParentEntry.categoryId,
        });
        if (!testmainAttributeParent)
          return next(new AppError("Main Attribute of parent not found", 404));

        const testAttributeValue = await AttributeValue.findOne({
          attributeId: testmainAttributeParent,
          categoryEntityId: testParentEntry._id,
        });
        if (!testAttributeValue)
          return next(
            new AppError("Main Attribute data of parent not found", 404)
          );
        formatEntry[`${attribute.name}`] = {
          id: testEntry.categoryId,
          name: testAttributeValue.value,
        };
      } else {
        formatEntry[`${attribute.name}`] = attributeValue.value;
      }
    }
    attributeEntries.push(formatEntry);
  }
  formatOutput["attributeEntries"] = attributeEntries;

  res.status(200).json({
    status: "success",
    data: formatOutput,
  });
});

// POST /api/category/:categoryId/entry (testing)
exports.createEntry = catchAsync(async (req, res, next) => {
  await checkCollab(
    next,
    req.params.projectId,
    req.user.id,
    "You do not have permission to create a new category.",
    "can_edit",
    "owner"
  );

  if (!isValidObjectId(req.params.categoryId))
    return next(new AppError("Invalid categoryId", 400));

  const testCategory = await Category.findById(req.params.categoryId);
  if (!testCategory) return next(new AppError("Category not found", 404));

  const attributes = await Attribute.find({
    categoryId: req.params.categoryId,
  });

  // Check input validity
  for (const attribute of Object.keys(req.body)) {
    if (!attributes.map((obj) => obj.name).includes(attribute))
      return next(new AppError("Invalid input", 400));
  }

  // Create Category Entity
  const createEntry = await CategoryEntity.create({
    categoryId: req.params.categoryId,
    createdAt: Date.now(),
    createdBy: req.user.id,
  });
  let failed = false;
  const createdAttributeValue = [];
  let reason = "";
  let errCode = 400;
  // Create Attribute Value
  for (const attribute of Object.keys(req.body)) {
    const dataAttribute = await Attribute.findOne({
      name: attribute,
      categoryId: req.params.categoryId,
    });
    if (dataAttribute.type === "category_reference") {
      if (!isValidObjectId(req.body[`${attribute}`])) {
        failed = true;
        reason = "Invalid parentId";
        break;
      }
      const testEntry = await CategoryEntity.findById(req.body[`${attribute}`]);
      if (!testEntry) {
        failed = true;
        reason = "Parent Reference not found";
        errCode = 404;
        break;
      }
    }
    const attributeValue = await AttributeValue.create({
      categoryEntityId: createEntry._id,
      attributeId: dataAttribute._id,
      value: req.body[`${attribute}`],
    });
  }

  if (failed) {
    for (const createdAttribute of createdAttributeValue) {
      await AttributeValue.deleteOne({ _id: createdAttribute._id });
    }
    return next(new AppError(reason, errCode));
  }

  res.status(201).json();
});

// PUT /api/category/:categoryId
exports.editCategory = catchAsync(async (req, res, next) => {
  res.status(204).json();
});

// PUT /api/entry/:entryId
exports.editEntry = catchAsync(async (req, res, next) => {
  res.status(204).json();
});

// DELETE /api/category/:categoryId
exports.deleteCategory = catchAsync(async (req, res, next) => {
  res.status(204).json();
});

// DELETE /api/entry/:entryId
exports.deleteEntry = catchAsync(async (req, res, next) => {
  res.status(204).json();
});
