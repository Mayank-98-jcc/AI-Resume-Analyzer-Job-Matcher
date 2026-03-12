const skills = require("./skillList");

function extractSkills(text) {

 const lowerText = text.toLowerCase();

 const foundSkills = skills.filter(skill =>
   lowerText.includes(skill)
 );

 return foundSkills;

}

module.exports = extractSkills;