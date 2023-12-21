const mongoose = require("mongoose");
const catchAsync = require("../utils/catchAsync");
const checkCollab = require("./../utils/checkCollab");

const Project = require("./../models/projectModel");
const Template = require("./../models/templateModel");
const Permission = require("./../models/permissionModel");
const Collaborator = require("./../models/collaboratorModel");
const Phase = require("./../models/phaseModel");

const AppError = require("../utils/appError");

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

exports.getProjects = catchAsync(async (req, res, next) => {
  // Query project that matching requirement
  const match = {
    "project.isDeleted": false,
    "project.isArchived": false,
  };

  // Search Query
  if (req.query.searchQuery) {
    match["project.name"] = {
      $regex: `${req.query.searchQuery}`,
      $options: "i",
    };
  }
  // SortBy Quert
  const sort = {};
  if (req.query.sortBy === "ascending") {
    sort["name"] = 1;
  } else if (req.query.sortBy === "descending") {
    sort["name"] = -1;
  } else if (req.query.sortBy === "newest") {
    sort["createdAt"] = -1;
  } else if (req.query.sortBy === "oldest") {
    sort["createdAt"] = 1;
  } else if (req.query.sortBy)
    return next(new AppError("Wrong sortBy query", 400));

  if (req.query.status === "archived") {
    match["project.isArchived"] = true;
  }

  const collaboratorProject = await Collaborator.aggregate([
    {
      $match: { userId: new mongoose.Types.ObjectId(req.user._id) },
    },
    {
      $group: {
        _id: "$projectId",
      },
    },
    {
      $lookup: {
        from: "projects",
        localField: "_id",
        foreignField: "_id",
        as: "project",
      },
    },
    {
      $unwind: "$project",
    },
    {
      $match: match,
    },
    {
      $lookup: {
        from: "users",
        localField: "project.owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $project: {
        _id: 0,
        id: "$project._id",
        name: "$project.name",
        owner: "$owner.name",
        location: "$project.location",
        startedAt: "$project.startedAt",
        createdAt: "$project.createdAt",
        isArchived: "$project.isArchived",
      },
    },
    {
      $sort: sort,
    },
    {
      $project: {
        createdAt: 0,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: collaboratorProject,
  });
});

exports.createProject = catchAsync(async (req, res, next) => {
  const project = req.body;
  // Check all input requirement
  if (
    !project.name ||
    !project.template ||
    !project.location ||
    !isValidObjectId(project.template)
  )
    return next(
      new AppError(
        "Please input all required input for creating new project.",
        401
      )
    );

  const testTemplate = await Template.findById(project.template);
  if (!testTemplate) return next(new AppError("Template not found", 404));

  // Create new project
  const newProject = await Project.create({
    owner: req.user._id,
    startedAt: new Date(req.body.startedAt) || Date.now(),
    createdAt: Date.now(),
    editedAt: Date.now(),
    editedBy: req.user._id,
    ...project,
  });

  // Add owner to collaborator
  const permission = await Permission.findOne({ name: "owner" });
  const newCollaborator = await Collaborator.create({
    userId: req.user._id,
    permissionId: permission._id,
    projectId: newProject._id,
    createdAt: Date.now(),
    createdBy: req.user._id,
    editedAt: Date.now(),
    editedBy: req.user._id,
  });

  res.status(201).json();
});

exports.getInfo = catchAsync(async (req, res, next) => {
  const projectId = req.params.projectId;
  // Check ว่า userid มีสิทธิได้ getinfo รึป่าว
  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 404));
  const collaboratorProject = await Collaborator.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(req.user._id),
        projectId: new mongoose.Types.ObjectId(req.params.projectId),
      },
    },
    // {
    //   $group: {
    //     _id: "$projectId",
    //   },
    // },
    {
      $lookup: {
        from: "projects",
        localField: "projectId",
        foreignField: "_id",
        as: "project",
      },
    },
    {
      $unwind: "$project",
    },
    {
      $lookup: {
        from: "users",
        localField: "project.owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $lookup: {
        from: "permissions",
        localField: "permissionId",
        foreignField: "_id",
        as: "permission",
      },
    },
    {
      $unwind: "$permission",
    },
    {
      $project: {
        _id: 0,
        name: "$project.name",
        description: "$project.description",
        ownerName: "$owner.name",
        location: "$project.location",

        startedAt: "$project.startedAt",
        endedAt: "$project.endedAt",
        isArchived: "$project.isArchived",
        permission: "$permission.name",
      },
    },
  ]);
  if (collaboratorProject.length === 0)
    return next(
      new AppError("You do not have permission to access this project", 403)
    );

  const activePhaseId = await Phase.findOne({ projectId, isActive: true });

  res.status(200).json({
    status: "success",
    data: {
      activePhaseId: activePhaseId ? activePhaseId._id : null,
      ...collaboratorProject[0],
    },
  });
});

exports.archived = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 404));

  const projectCollab = await Collaborator.findOne({
    projectId: req.params.projectId,
    userId: req.user._id,
  });

  if (!req.body.isArchived)
    return next(new AppError("Cannot unarchived project", 400));

  if (!projectCollab)
    return next(
      new AppError("You do not have permission to access this project", 403)
    );

  const can_edit = await Permission.findOne({ name: "can_edit" });
  const owner = await Permission.findOne({ name: "owner" });
  if (
    !compareId(projectCollab.permissionId, can_edit._id) &&
    !compareId(projectCollab.permissionId, owner._id)
  )
    return next(
      new AppError("You do not have permission to archive project", 403)
    );

  // Update all phase to inactive
  const updatedPhase = await Phase.updateMany(
    { projectId: req.params.projectId, isActive: true },
    {
      isActive: false,
      editedBy: req.user._id,
      editedAt: Date.now(),
      endedAt: Date.now(),
    }
  );

  const updatedProject = await Project.findOneAndUpdate(
    {
      _id: req.params.projectId,
    },
    {
      isArchived: req.body.isArchived,
      editedBy: req.user._id,
      editedAt: Date.now(),
      endedAt: Date.now(),
    }
  );
  res.status(204).json();
});

exports.deleted = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 401));

  const projectCollab = await Collaborator.findOne({
    projectId: req.params.projectId,
    userId: req.user._id,
  });

  if (!projectCollab)
    return next(
      new AppError("You do not have permission to access this project", 403)
    );
  const owner = await Permission.findOne({ name: "owner" });
  if (!compareId(projectCollab.permissionId, owner._id))
    return next(
      new AppError("You do not have permission to delete project", 403)
    );

  const updatedProject = await Project.findOneAndUpdate(
    {
      _id: req.params.projectId,
    },
    {
      isDeleted: true,
      deletedAt: Date.now(),
    }
  );

  // Update phase to inactive
  const updatePhase = await Phase.updateMany(
    {
      projectId: req.params.projectId,
    },
    {
      isDeleted: true,
      deletedAt: Date.now(),
    }
  );
  // change active phase endDate to present

  res.status(204).json();
});

exports.edited = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 404));

  const projectCollab = await Collaborator.findOne({
    projectId: req.params.projectId,
    userId: req.user._id,
  });

  if (!projectCollab)
    return next(
      new AppError("You do not have permission to access this project", 403)
    );

  const can_edit = await Permission.findOne({ name: "can_edit" });
  const owner = await Permission.findOne({ name: "owner" });
  if (
    !compareId(projectCollab.permissionId, can_edit._id) &&
    !compareId(projectCollab.permissionId, owner._id)
  )
    return next(
      new AppError("You do not have permission to edit project", 403)
    );

  const updatedProject = await Project.findOneAndUpdate(
    {
      _id: req.params.projectId,
    },
    {
      editedAt: Date.now(),
      editedBy: req.user._id,
      ...req.body,
    }
  );
  res.status(204).json();
});
