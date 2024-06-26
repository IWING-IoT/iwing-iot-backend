const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
const formidableMiddleware = require("express-formidable");
const arrayTransform = require("./middlewares/arrayTransform");
const dotenv = require("dotenv");
dotenv.config();

const AppError = require("./utils/appError");
const globalErrorHandler = require("./utils/errorHandler");

const adminRouter = require("./routes/adminRoutes");
const userRouter = require("./routes/userRoutes");
const roleRouter = require("./routes/roleRoutes");
const projectRouter = require("./routes/projectRoutes");
const templateRouter = require("./routes/templateRoutes");
const permissionRouter = require("./routes/permissionRoutes");
const collaboratorRouter = require("./routes/collaboratorRoutes");
const phaseRouter = require("./routes/phaseRoutes");
const categoryRouter = require("./routes/categoryRoutes");
const phaseApiRouter = require("./routes/phaseApiRoutes");
const entryRouter = require("./routes/entryRoutes");
const deviceRouter = require("./routes/deviceRoutes");
const devicePhaseRouter = require("./routes/devicePhaseRoutes");
const firmwareRouter = require("./routes/firmwareRoutes");
const firmwareVersionRouter = require("./routes/firmwareVersionRoutes");
const messageRouter = require("./routes/messageRoutes");
const deviceFirmwareRouter = require("./routes/deviceFirmwareRoutes");
const areaRouter = require("./routes/areaRoutes");
const markRouter = require("./routes/markRoutes");

const app = express();

// app.use(bodyParser.json());
app.use(formidableMiddleware());

app.use(morgan("dev"));
app.use(cors());
app.use(arrayTransform);

app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.use("/api/role", roleRouter);
app.use("/api/project", projectRouter);
app.use("/api/template", templateRouter);
app.use("/api/permission", permissionRouter);
app.use("/api/collaborator", collaboratorRouter);
app.use("/api/phase", phaseRouter);
app.use("/api/phaseApi", phaseApiRouter);
app.use("/api/device", deviceRouter);
app.use("/api/entry", entryRouter);
app.use("/api/devicePhase", devicePhaseRouter);
app.use("/api/firmware", firmwareRouter);
app.use("/api/firmwareVersion", firmwareVersionRouter);
app.use("/api/message", messageRouter);
app.use("/api/deviceFirmware", deviceFirmwareRouter);
app.use("/api/area", areaRouter);
app.use("/api/mark", markRouter);

app.use(globalErrorHandler);

app.get("/*", (req, res) => {
  res.send("Hello World");
});

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

module.exports = app;
