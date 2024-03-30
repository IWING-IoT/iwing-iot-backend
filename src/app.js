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

app.use(process.env.BASE_URL + "/admin", adminRouter);
app.use(process.env.BASE_URL + "/user", userRouter);
app.use(process.env.BASE_URL + "/role", roleRouter);
app.use(process.env.BASE_URL + "/project", projectRouter);
app.use(process.env.BASE_URL + "/template", templateRouter);
app.use(process.env.BASE_URL + "/permission", permissionRouter);
app.use(process.env.BASE_URL + "/collaborator", collaboratorRouter);
app.use(process.env.BASE_URL + "/phase", phaseRouter);
app.use(process.env.BASE_URL + "/phaseApi", phaseApiRouter);
app.use(process.env.BASE_URL + "/device", deviceRouter);
app.use(process.env.BASE_URL + "/entry", entryRouter);
app.use(process.env.BASE_URL + "/devicePhase", devicePhaseRouter);
app.use(process.env.BASE_URL + "/firmware", firmwareRouter);
app.use(process.env.BASE_URL + "/firmwareVersion", firmwareVersionRouter);
app.use(process.env.BASE_URL + "/message", messageRouter);
app.use(process.env.BASE_URL + "/deviceFirmware", deviceFirmwareRouter);
app.use(process.env.BASE_URL + "/area", areaRouter);
app.use(process.env.BASE_URL + "/mark", markRouter);

app.use(globalErrorHandler);

app.get("/*", (req, res) => {
  res.send("Hello World");
});

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

module.exports = app;
