const mongoose = require("mongoose");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const checkCollab = require("../utils/checkCollab");

const Project = require("../models/projectModel");
const User = require("../models/userModel");

const CategoryData = require("../models/categoryDataModel");
const Category = require("../models/categoryModel");
const Collaborator = require("../models/collaboratorModel");
const Permission = require("../models/permissionModel");

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

exports.getCategories = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 400));

  const testProject = await Project.findById(req.params.projectId);
  if (!testProject) return next(new AppError("Project not found", 404));

  const categories = await Category.find(
    { projectId: req.params.projectId },
    { id: "$_id", name: 1, _id: 0 }
  );
  res.status(200).json({
    status: "success",
    data: categories,
  });
});

exports.getCategoryInfo = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.categoryId))
    return next(new AppError("Invalid categoryId", 400));

  const testCategory = await Category.findById(req.params.categoryId);
  if (!testCategory) return next(new AppError("Category not found", 404));

  const formatOutput = {
    name: testCategory.name,
    mainAttribute: testCategory.mainAttribute,
  };
  const entryDefinitions = [];
  entryDefinitions.push({
    id: 1,
    accessorKey: testCategory.mainAttribute,
    type: "string",
  });
  let id = 1;
  for (const attribute of testCategory.otherAttributes) {
    let tempDefinition = {
      id,
      accessorKey: attribute.name,
      type: attribute.type,
    };
    if (attribute.type === "category_reference") {
      const refCategory = await Category.findById(attribute.parentCategoryId);
      if (!refCategory)
        return next(new AppError("Reference category not found", 404));
      tempDefinition["category"] = {
        id: refCategory._id,
        name: refCategory.name,
      };
    }
    entryDefinitions.push(tempDefinition);
    id++;
  }
  formatOutput.entryDefinitions = entryDefinitions;

  const attributeEntries = [];
  const testEntry = await CategoryData.find(
    {
      categoryId: req.params.categoryId,
    },
    {
      categoryId: 0,
      createdAt: 0,
      createdBy: 0,
      editedAt: 0,
      editedBy: 0,
      __v: 0,
    }
  );

  const allAttribute = entryDefinitions.map((obj) => obj.accessorKey);
  allAttribute.push(testCategory.mainAttribute);
  let id2 = 1;
  for (const entry of testEntry) {
    const formatEntry = {};
    for (const attribute of Object.keys(entry)) {
      if (allAttribute.includes(attribute)) {
        if (
          attribute !== testCategory.mainAttribute &&
          testCategory.otherAttributes.filter((obj) => {
            return attribute === obj.name;
          })[0].type === "category_reference"
        ) {
          const testCategoryData = await CategoryData.findById(
            entry[`${attribute}`]
          );
          if (!testCategory)
            return next(new AppError("CategoryData not found", 404));
          const testCategory2 = await Category.findById(
            testCategoryData.categoryId
          );
          if (!testCategory2)
            return next(new AppError("Category not found", 404));

          entry[`${attribute}`] = {
            id: testCategoryData._id,
            name: testCategoryData[`${testCategory2.mainAttribute}`],
          };
        }
        formatEntry[`${attribute}`] = entry[`${attribute}`];
      }
    }
    id2++;
    formatEntry.id = id2;
    attributeEntries.push(formatEntry);
  }
  formatOutput.attributeEntries = attributeEntries;
  res.status(200).json({
    status: "success",
    data: formatOutput,
  });
});

exports.createCategory = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 400));

  const testProject = await Project.findById(req.params.projectId);
  if (!testProject) return next(new AppError("Project not found", 404));

  const testCategoryName = await Category.findOne({ name: req.body.name });
  if (testCategoryName) return next(new AppError("Duplicate category", 400));

  // Check Input Format
  if (!req.body.name || !req.body.mainAttribute)
    return next(new AppError("Invalid input", 400));

  let formatInput = {
    projectId: req.params.projectId,
    name: req.body.name,
    description: req.body.description ? req.body.description : "",
    mainAttribute: req.body.mainAttribute,
    createdAt: Date.now(),
    createdBy: req.user._id,
    otherAttributes: [],
  };

  const otherAttributeNameCheck = [];

  for (let i = 0; i < req.body.otherAttribute.length; ++i) {
    const otherAttribute = req.body.otherAttribute[i];
    if (!otherAttribute.name || !otherAttribute.type)
      return next(new AppError("Invalid otherAttribute input", 400));

    if (otherAttributeNameCheck.includes(otherAttribute.name))
      return next(new AppError("Duplicate other attribute name", 400));

    otherAttributeNameCheck.push(otherAttribute.name);
    formatInput.otherAttributes[i] = {
      name: otherAttribute.name,
      type: otherAttribute.type,
    };

    if (otherAttribute.referenceFrom.length > 0) {
      if (!isValidObjectId(otherAttribute.referenceFrom))
        return next(new AppError("Invalid otherAttribute id", 400));
      const testCategory = await Category.findById(
        otherAttribute.referenceFrom
      );
      if (!testCategory)
        return next(new AppError("Reference category not found"));

      formatInput.otherAttributes[i]["parentCategoryId"] =
        otherAttribute.referenceFrom;
    }
  }
  const createdCategory = Category.create(formatInput);
  res.status(201).json();
});

exports.getEntryByCategory = catchAsync(async (req, res, next) => {
  res.status(200).json();
});

exports.addEntry = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.categoryId))
    return next(new AppError("Invalid categoryId", 400));

  const testCategory = await Category.findById(req.params.categoryId);
  if (!testCategory) next(new AppError("Category not found", 404));

  // Check main category
  if (!Object.keys(req.body).includes(testCategory.mainAttribute))
    return next(new AppError("Required mainAttribute", 400));

  const allAttribute = testCategory.otherAttributes.map((obj) => obj.name);
  allAttribute.push(testCategory.mainAttribute);

  const formatInput = {
    categoryId: req.params.categoryId,
    createdAt: Date.now(),
    createdBy: req.user._id,
  };
  // Check if otherCategory entry match with category attribute
  for (const attribute of Object.keys(req.body)) {
    if (!allAttribute.includes(attribute))
      return next(new AppError("Invalid attributeNane", 400));

    if (
      attribute !== testCategory.mainAttribute &&
      testCategory.otherAttributes.filter((obj) => {
        return attribute === obj.name;
      })[0].type === "category_reference"
    ) {
      const testCategoryData = await CategoryData.findById(
        req.body[`${attribute}`]
      );

      if (!testCategoryData)
        return next(new AppError("Reference Data not found", 404));
    }
    formatInput[`${attribute}`] = req.body[`${attribute}`];
  }

  const createdAttributeData = await CategoryData.create(formatInput);

  res.status(201).json();
});
