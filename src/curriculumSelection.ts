export function orderCurriculumSelection(
  lessonCharacters: string,
  selected: readonly string[],
) {
  const selectedSet = new Set(selected);
  return [...new Set(Array.from(lessonCharacters))].filter((character) =>
    selectedSet.has(character),
  );
}
