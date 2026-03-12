const express = require("express");
const router = express.Router();
const { matchJob } = require("../controllers/jobController");

router.post("/match", matchJob);

module.exports = router;