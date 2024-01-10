const express = require("express");
const { updateSetting, getSetting, addOffice, addOfficeLocation, getOfficeLocation } = require("./setting.controllers");
const authorize = require("../../utils/authorize"); // authentication middleware

const settingRoutes = express.Router();

settingRoutes.put("/:id", authorize("update-setting"), updateSetting);
settingRoutes.get("/", authorize("readAll-setting"), getSetting);
settingRoutes.post("/addOffice", authorize("update-setting"), addOffice);
settingRoutes.post("/addOfficeLocation", authorize("update-setting"), addOfficeLocation);
settingRoutes.get("/getOfficeLocation", authorize("update-setting"), getOfficeLocation);

module.exports = settingRoutes;
