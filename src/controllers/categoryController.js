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
const { format } = require("morgan");

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
  if (id1 && id2) {
    return id1.toString() === id2.toString();
  } else return false;
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

// POST /api/project/:projectId/category (finished)
exports.createCategory = catchAsync(async (req, res, next) => {
  await checkCollab(
    next,
    req.params.projectId,
    req.user.id,
    "You do not have permission to create a new category.",
    "can_edit",
    "owner"
  );

  // Check is attribute name is duplicate
  if (
    ((arr) => new Set(arr).size !== arr.length)(
      req.fields.otherAttribute.map((arr) => arr.name)
    ) ||
    req.fields.otherAttribute
      .map((arr) => arr.name)
      .includes(req.fields.mainAttribute)
  )
    return next(new AppError("Duplicate Attribute Name", 400));

  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 400));

  const testProject = await Project.findById(req.params.projectId);
  if (!testProject) return next(new AppError("Project not found", 404));

  if (!req.fields.name || !req.fields.mainAttribute)
    return next(new AppError("Invalid input", 400));

  const testCategory = await Category.findOne({
    name: req.fields.name,
    projectId: req.params.projectId,
  });
  if (testCategory) return next(new AppError("Duplicate category name", 400));

  // Create category
  const createCategory = await Category.create({
    name: req.fields.name,
    description: req.fields.description ? req.fields.description : "",
    projectId: req.params.projectId,
    createdAt: Date.now(),
    createdBy: req.user.id,
  });

  // Create Attribute
  // Main
  const mainAttribute = await Attribute.create({
    categoryId: createCategory._id,
    name: req.fields.mainAttribute,
    type: "string",
    position: 0,
    createdAt: Date.now(),
    createdBy: req.user.id,
  });
  // Others
  let position = 1;
  for (const attribute of req.fields.otherAttribute) {
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

// GET /api/project/:projectId/category (finished)
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

  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 400));

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

// GET /api/category/:categoryId (finished)
exports.getCategoryEntry = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.categoryId))
    return next(new AppError("Invalid categoryId", 400));

  const testCategory = await Category.findById(req.params.categoryId);
  if (!testCategory) return next(new AppError("Category not found", 404));

  await checkCollab(
    next,
    testCategory.projectId,
    req.user.id,
    "You do not have permission to create a new category.",
    "can_edit",
    "owner",
    "can_view"
  );
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
        parentCategoryId: 1,
      },
    },
  ]);

  const mainAttribute = otherAttribute.shift();
  formatOutput["mainAttribute"] = mainAttribute.accessorKey;

  for (let i = 0; i < otherAttribute.length; ++i) {
    if (otherAttribute[i].type === "category_reference") {
      otherAttribute[i]["category"] = {};
      otherAttribute[i]["category"]["id"] = otherAttribute[i].parentCategoryId;

      const testParentCategory = await Category.findById(
        otherAttribute[i]["parentCategoryId"]
      );
      if (!testParentCategory) {
        continue;
      }
      otherAttribute[i]["category"]["name"] = testParentCategory.name;
      delete otherAttribute[i].parentCategoryId;
    }
  }
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
        if (!testParentEntry) {
          // remove invalid parentEntity
          await AttributeValue.deleteOne({ _id: attributeValue._id });
        } else {
          const testmainAttributeParent = await Attribute.findOne({
            position: 0,
            categoryId: testParentEntry.categoryId,
          });
          if (!testmainAttributeParent)
            return next(
              new AppError("Main Attribute of parent not found", 404)
            );

          const testAttributeValue = await AttributeValue.findOne({
            attributeId: testmainAttributeParent,
            categoryEntityId: testParentEntry._id,
          });
          if (!testAttributeValue)
            return next(
              new AppError("Main Attribute data of parent not found", 404)
            );
          formatEntry[`${attribute.name}`] = {
            id: testParentEntry._id,
            name: testAttributeValue.value,
          };
        }
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

// POST /api/category/:categoryId/entry (finished)
exports.createEntry = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.categoryId))
    return next(new AppError("Invalid categoryId", 400));

  const testCategory = await Category.findById(req.params.categoryId);
  if (!testCategory) return next(new AppError("Category not found", 404));

  await checkCollab(
    next,
    testCategory.projectId,
    req.user.id,
    "You do not have permission to create a new category.",
    "can_edit",
    "owner"
  );

  const attributes = await Attribute.find({
    categoryId: req.params.categoryId,
  });

  // Check input validity
  for (const attribute of Object.keys(req.fields)) {
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
  for (const attribute of Object.keys(req.fields)) {
    const dataAttribute = await Attribute.findOne({
      name: attribute,
      categoryId: req.params.categoryId,
    });
    if (dataAttribute.type === "category_reference") {
      if (!isValidObjectId(req.fields[`${attribute}`])) {
        failed = true;
        reason = "Invalid parentId";
        break;
      }
      const testEntry = await CategoryEntity.findById(
        req.fields[`${attribute}`]
      );
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
      value: req.fields[`${attribute}`],
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

// GET /api/category/:categoryId/entry (finished)
exports.getCategoryMainAttribute = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.categoryId))
    return next(new AppError("Invalid categoryId", 400));

  const testCategory = await Category.findById(req.params.categoryId);
  if (!testCategory) return next(new AppError("Category not found", 404));

  await checkCollab(
    next,
    testCategory.projectId,
    req.user.id,
    "You do not have permission to create a new category.",
    "can_edit",
    "owner",
    "can_view"
  );

  const categoryEntites = await CategoryEntity.find({
    categoryId: req.params.categoryId,
  });

  const attribute = await Attribute.findOne({
    categoryId: req.params.categoryId,
    position: 0,
  });

  const attributeValues = await AttributeValue.aggregate([
    {
      $match: {
        attributeId: attribute._id,
      },
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        id: "$categoryEntityId",
        name: "$value",
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: attributeValues,
  });
});

// PUT /api/category/:categoryId (finished)
exports.editCategory = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.categoryId))
    return next(new AppError("Invalid categoryId", 400));

  const testCategory = await Category.findById(req.params.categoryId);
  if (!testCategory) return next(new AppError("Category not found", 404));

  await checkCollab(
    next,
    testCategory.projectId,
    req.user.id,
    "You do not have permission to create a new category.",
    "can_edit",
    "owner"
  );

  // Check is attribute name is duplicate
  if (
    ((arr) => new Set(arr).size !== arr.length)(
      req.fields.otherAttribute.map((arr) => arr.name)
    ) ||
    req.fields.otherAttribute
      .map((arr) => arr.name)
      .includes(req.fields.mainAttribute)
  )
    return next(new AppError("Duplicate Attribute Name", 400));

  // Check duplicate category name
  const testCategoryName = await Category.findOne({
    name: req.fields.name,
    projectId: req.params.projectId,
  });
  if (!testCategoryName) return next(new AppError("Duplicate category", 400));
  // Change metadata and mainAttribute

  const updatedCategory = await Category.findOneAndUpdate(
    { _id: req.params.categoryId },
    {
      name: req.fields.name,
      description: req.fields.description,
      editedAt: Date.now(),
      editedBy: req.user.id,
    }
  );

  const mainAttribute = await Attribute.findOneAndUpdate(
    {
      categoryId: req.params.categoryId,
      position: 0,
    },
    {
      name: req.fields.mainAttribute,
      editedAt: Date.now(),
      editedBy: req.user.id,
    }
  );

  /* // เงื่อนไขมหาศาล
    1. ถ้าลบ attribute นั้นออกจะต้องลบ AttributeValue ของ column นั้นทั้งหมด
    2. ถ้ามีการเปลี่ยน parentCategory จะต้องล้างข้อมูล attributeValue ของ column นั้นทั้งหมด
  */

  let oldAttributes = await Attribute.find({
    categoryId: req.params.categoryId,
  }).sort({ position: 1 });

  oldAttributes.shift();

  let position = 1;
  for (const newAttribute of req.fields.otherAttribute) {
    if (newAttribute.id) {
      const updatedDoc = {};
      // edit attribute เก่า

      const oldAttribute = await Attribute.findById(newAttribute.id);
      if (!oldAttribute) return next(new AppError("Attribute not found", 404));

      if (
        oldAttribute.type !== newAttribute.type ||
        (newAttribute.referenceFrom !== "" &&
          !compareId(
            oldAttribute.parentCategoryId ? oldAttribute.parentCategoryId : "",
            newAttribute.referenceFrom
          ))
      ) {
        // ถ้ามีการเปลี่ยน data type หรือถ้า parentReference เปลี่ยน ต้องลบ attributeValue ทั้งหมด
        await AttributeValue.deleteMany({ attributeId: oldAttribute._id });
      }
      // update attribute metadata
      const updatedAttribute = await Attribute.findOneAndUpdate(
        {
          _id: newAttribute.id,
        },
        {
          name: newAttribute.name,
          type: newAttribute.type,
          parentCategoryId:
            newAttribute.type === "category_reference"
              ? newAttribute.referenceFrom
              : null,
          position,
          editedAt: Date.now(),
          editedBy: req.user.id,
        }
      );

      oldAttributes = oldAttributes.filter(
        (attribute) => !compareId(attribute._id, updatedAttribute._id)
      );
    } else {
      // create new attribute

      let tempAttribute = {
        categoryId: req.params.categoryId,
        position,
        createdAt: Date.now(),
        createdBy: req.user.id,
      };

      if (!newAttribute.name || !newAttribute.type)
        return next(new AppError("Invalid input", 400));
      tempAttribute["name"] = newAttribute.name;
      tempAttribute["type"] = newAttribute.type;

      if (newAttribute.type === "category_reference") {
        if (!isValidObjectId(newAttribute.referenceFrom))
          return next(new AppError("Invalid parentId", 400));

        const testParentCategory = await Category.findById(
          newAttribute.referenceFrom
        );
        if (!testParentCategory)
          return next(new AppError("Parent Categroy not found", 404));

        tempAttribute["parentCategoryId"] = newAttribute.referenceFrom;
      }
      const createAttribute = await Attribute.create(tempAttribute);
    }
    position++;
  }

  // Removed Attribute
  for (const removedAttribute of oldAttributes) {
    await Attribute.deleteOne({ _id: removedAttribute._id });
    // Remove all of attributeValue
    await AttributeValue.deleteMany({ attributeId: removedAttribute._id });
  }
  res.status(204).json();
});

// PUT /api/entry/:entryId (finished)
exports.editEntry = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.entryId))
    return next(new AppError("Invalid entryId"));
  const testEntry = await CategoryEntity.findById(req.params.entryId);
  if (!testEntry) return next(new AppError("Entry not found", 404));
  console.log(req.fields);
  for (const entry of Object.keys(req.fields)) {
    const attribute = await Attribute.findOne({
      name: entry,
      categoryId: testEntry.categoryId,
    });
    const updatedAttributeValue = await AttributeValue.findOneAndUpdate(
      {
        categoryEntityId: req.params.entryId,
        attributeId: attribute._id,
      },
      {
        value: req.fields[`${entry}`],
      }
    );
    if (!updatedAttributeValue) {
      await AttributeValue.create({
        categoryEntityId: req.params.entryId,
        attributeId: attribute._id,
        value: req.fields[`${entry}`],
      });
    }
  }
  res.status(204).json();
});

// DELETE /api/category/:categoryId (developing)
exports.deleteCategory = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.categoryId))
    return next(new AppError("Invalid categoryId", 400));

  const testCategory = await Category.findById(req.params.categoryId);
  if (!testCategory) return next(new AppError("Category not found", 404));

  // การลบ category
  // ลบ parentCategory
  const categoryContainParent = await Attribute.aggregate([
    {
      $match: {
        parentCategoryId: new mongoose.Types.ObjectId(testCategory._id),
      },
    },
    {
      $project: {
        _id: 0,
        categoryId: 1,
      },
    },
    {
      $group: { _id: "$categoryId" },
    },
  ]);

  // run เลข position ใน attribute ใหม่ของทุก category
  const entries = await CategoryEntity.find({
    categoryId: req.params.categoryId,
  });

  // AttributeValue

  // for (const entry of entries) {
  //   await AttributeValue.deleteMany({ categoryEntityId: entry._id });
  //   await CategoryEntity.deleteOne({ _id: entry._id });
  // }

  // await Attribute.deleteMany({ categoryId: req.params.categoryId });
  // await Category.deleteOne({ _id: req.params.categoryId });

  res.status(204).json();
});

// DELETE /api/entry/:entryId (finished)
exports.deleteEntry = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.entryId))
    return next(new AppError("Invalid entryId", 400));

  const testEntry = await CategoryEntity.findById(req.params.entryId);
  if (!testEntry) return next(new AppError("Entry not found", 404));

  await AttributeValue.deleteMany({ categoryEntityId: testEntry._id });
  await CategoryEntity.deleteOne({ _id: req.params.entryId });
  res.status(204).json();
});
