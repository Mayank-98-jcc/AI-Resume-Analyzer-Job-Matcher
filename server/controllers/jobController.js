const Resume = require("../models/Resume");
const matchJobDescription = require("../utils/jobMatcher");

exports.matchJob = async (req, res) => {

  try {

    const { resumeId, jobDescription } = req.body;

    const resume = await Resume.findOne({
      _id: resumeId,
      userId: req.user._id
    });

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    const result = matchJobDescription(resume.skills, jobDescription);

    res.json({
      resumeSkills: resume.skills,
      jobSkills: result.jobSkills,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      matchScore: result.score
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};
