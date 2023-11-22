const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./utils/errorHandler");

const adminRouter = require("./routes/adminRoutes");
const userRouter = require("./routes/userRoutes");
const roleRouter = require("./routes/roleRoutes");
const projectRouter = require("./routes/projectRoutes");
const templateRouter = require("./routes/templateRoutes");
const permissionRouter = require("./routes/permissionRoutes");
const collaboratorRouter = require("./routes/collaboratorRoutes");

const app = express();

app.use(bodyParser.json());

app.use(morgan("dev"));
// app.use(cors());

app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.use("/api/role", roleRouter);
app.use("/api/project", projectRouter);
app.use("/api/template", templateRouter);
app.use("/api/permission", permissionRouter);
app.use("/api/collaborator", collaboratorRouter);

app.use(globalErrorHandler);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

module.exports = app;
