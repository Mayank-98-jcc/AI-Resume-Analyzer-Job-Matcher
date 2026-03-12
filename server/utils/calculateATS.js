const skillList = require("./skillList");

function calculateATS(foundSkills) {

 const totalSkills = skillList.length;

 const score = Math.round((foundSkills.length / totalSkills) * 100);

 const missingSkills = skillList.filter(skill =>
   !foundSkills.includes(skill)
 );

 return {
   score,
   missingSkills
 };

}

module.exports = calculateATS;