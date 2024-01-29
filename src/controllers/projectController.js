const mongoose = require("mongoose");
const catchAsync = require("../utils/catchAsync");
const checkCollab = require("./../utils/checkCollab");

const Project = require("./../models/projectModel");
const Template = require("./../models/templateModel");
const Permission = require("./../models/permissionModel");
const Collaborator = require("./../models/collaboratorModel");
const Phase = require("./../models/phaseModel");
const Device = require("./../models/deviceModel");
const Message = require("./../models/messageModel");
const DeviceFirmware = require("./../models/deviceFirmwareModel");
const CategoryEntity = require("./../models/categoryEntityModel");
const Category = require("./../models/categoryModel");
const AttributeValue = require("./../models/attributeValueModel");
const Attribute = require("./../models/attributeModel");
const Area = require("./../models/areaModel");
const Mark = require("./../models/markModel");
const Gateway = require("./../models/gatewayModel");
const DeviceType = require("./../models/deviceTypeModel");

const AppError = require("../utils/appError");
const DevicePhase = require("../models/devicePhaseModel");
const PhaseApi = require("../models/phaseApiModel");

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

// GET /api/project/
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
        endedAt: "$project.endedAt",
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

// POST /api/project
exports.createProject = catchAsync(async (req, res, next) => {
  const project = req.fields;
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
    startedAt: new Date(req.fields.startedAt) || Date.now(),
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

// GET /api/project/:projectId
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

  res.status(200).json({
    status: "success",
    data: {
      ...collaboratorProject[0],
    },
  });
});

// PATCH /api/project/:projectId/archived
exports.archived = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 404));

  if (!req.fields.isArchived)
    return next(new AppError("Cannot unarchived project", 400));

  await checkCollab(
    next,
    req.params.projectId,
    req.user.id,
    "You do not have permission to archived project",
    "owner"
  );

  // Update all devicePhase to archived and return device free

  const phases = await Phase.find({ projectId: req.params.projectId });
  for (const phase of phases) {
    const devicePhases = await DevicePhase.find({ phaseId: phase._id });
    for (const devicePhase of devicePhases) {
      await DevicePhase.findByIdAndUpdate(devicePhase._id, {
        status: "archived",
        editedBy: req.user._id,
        editedAt: Date.now(),
      });

      await Device.findByIdAndUpdate(devicePhase.deviceId, {
        status: "available",
      });
    }

    await Phase.findByIdAndUpdate(phase._id, {
      isActive: false,
      editedBy: req.user._id,
      editedAt: Date.now(),
      endedAt: Date.now(),
    });
  }

  // Update all collaborators to can_view
  const can_view = await Permission.findOne({ name: "can_view" });
  await Collaborator.updateMany(
    { projectId: req.params.projectId },
    { permissionId: can_view._id }
  );

  const updatedProject = await Project.findOneAndUpdate(
    {
      _id: req.params.projectId,
    },
    {
      isArchived: req.fields.isArchived,
      editedBy: req.user._id,
      editedAt: Date.now(),
      endedAt: Date.now(),
    }
  );
  res.status(204).json();
});

// DELETE /api/project/:projectId
exports.deleted = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 401));

  await checkCollab(
    next,
    req.params.projectId,
    req.user.id,
    "You do not have permission to delete project",
    "owner"
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

  // Delete category
  // Delete entity value
  const categories = await Category.find({ projectId: req.params.projectId });
  for (const category of categories) {
    const entities = await CategoryEntity.find({ categoryId: category._id });
    for (const entity of entities) {
      await AttributeValue.deleteMany({ entityId: entity._id });
      await CategoryEntity.findByIdAndDelete(entity._id);
    }
    await Attribute.deleteMany({ categoryId: category._id });
    await Category.findByIdAndDelete(category._id);
  }

  // Delete collaborator
  await Collaborator.deleteMany({ projectId: req.params.projectId });

  // Update all devicePhase to archived and return device free

  const phases = await Phase.find({ projectId: req.params.projectId });
  for (const phase of phases) {
    const devicePhases = await DevicePhase.find({
      phaseId: phase._id,
    }).populate("deviceId");

    for (const devicePhase of devicePhases) {
      const type = await DeviceType.findById(devicePhase.deviceId.type);
      if (type.name === "gateway") {
        await Gateway.deleteMany({ gatewayId: devicePhase.deviceId._id });
      }
      await DevicePhase.deleteMany({ _id: devicePhase.deviceId });

      // Delete devicephase message
      await Message.deleteMany({ "metadata.devicePhaseId": devicePhase._id });

      // Delete deviceFirmware
      await DeviceFirmware.deleteMany({ devicePhaseId: devicePhase._id });

      await Device.findByIdAndUpdate(devicePhase.deviceId, {
        status: "available",
      });
    }
    await Mark.deleteMany({ phaseId: phase._id });
    await Area.deleteMany({ phaseId: phase._id });
    await PhaseApi.deleteMany({ phaseId: phase._id });
    await Phase.findByIdAndUpdate(phase._id, {
      isActive: false,
      isDeleted: true,
      deletedAt: Date.now(),
    });
  }

  res.status(204).json();
});

// PATCH /api/project/:projectId
exports.edited = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 404));

  await checkCollab(
    next,
    req.params.projectId,
    req.user.id,
    "You do not have permission to edit project",
    "owner",
    "can_edit"
  );

  const updatedProject = await Project.findOneAndUpdate(
    {
      _id: req.params.projectId,
    },
    {
      editedAt: Date.now(),
      editedBy: req.user._id,
      ...req.fields,
    }
  );
  res.status(204).json();
});
