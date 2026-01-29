import type { TFunction } from "i18next";
import { constructionSteps } from "@/data/constructionSteps";

// NOTE: Budget categories are stored/processed using the French step titles.
// We keep those strings as internal identifiers (for mapping/grouping), but
// translate what we DISPLAY using task IDs from constructionSteps + i18n.

const normalizeKey = (s: unknown) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

// Same merge behavior as budgetCategories.ts (Plomberie/Électricité rough-in + finition).
const mergeMap: Record<string, string> = {
  "plomberie-roughin": "Plomberie",
  "plomberie-finition": "Plomberie",
  "electricite-roughin": "Électricité",
  "electricite-finition": "Électricité",
};

const OTHER_ITEMS_FR = "Autres éléments";

const buildTaskIdLookup = () => {
  const map = new Map<string, string>();

  for (const step of constructionSteps) {
    // Physical work steps only
    if (
      step.phase !== "gros-oeuvre" &&
      step.phase !== "second-oeuvre" &&
      step.phase !== "finitions"
    ) {
      continue;
    }
    if (step.id === "inspections-finales") continue;

    const categoryName = mergeMap[step.id] ?? step.title;
    const catKey = normalizeKey(categoryName);

    for (const task of step.tasks) {
      const taskKey = normalizeKey(task.title);
      map.set(`${catKey}__${taskKey}`, task.id);
    }
  }

  return map;
};

const TASK_ID_BY_CATEGORY_AND_TITLE = buildTaskIdLookup();

export const translateBudgetTaskTitle = (
  t: TFunction,
  categoryName: string,
  taskTitle: string
): string => {
  // Special “Other items” bucket (coming from the grouping logic)
  if (normalizeKey(taskTitle) === normalizeKey(OTHER_ITEMS_FR)) {
    return t("budget.otherItems");
  }

  const key = `${normalizeKey(categoryName)}__${normalizeKey(taskTitle)}`;
  const taskId = TASK_ID_BY_CATEGORY_AND_TITLE.get(key);
  if (!taskId) return taskTitle;

  const i18nKey = `construction.tasks.${taskId}.title`;
  const translated = t(i18nKey);
  return translated === i18nKey ? taskTitle : translated;
};
