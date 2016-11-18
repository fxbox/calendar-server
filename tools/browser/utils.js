function idFromContent(content) {
  const idMatchResult = content.match(/\b\d+\b/);
  const id = idMatchResult && idMatchResult[0];
  return id;
}

module.exports = { idFromContent };
