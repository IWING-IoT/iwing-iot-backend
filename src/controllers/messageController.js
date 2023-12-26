const mongoose = require("mongoose");

const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const checkCollab = require("./../utils/checkCollab");

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

