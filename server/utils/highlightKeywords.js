function highlightMissingKeywords(text, missingSkills) {

  let highlightedText = text;

  missingSkills.forEach(skill => {

    const regex = new RegExp(skill, "gi");

    highlightedText = highlightedText.replace(
      regex,
      `**${skill.toUpperCase()}**`
    );

  });

  return highlightedText;

}

module.exports = highlightMissingKeywords;