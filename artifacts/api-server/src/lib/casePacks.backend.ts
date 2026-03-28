import { cases as legacyCases } from "../socket/gameData.js";

export type SimpleCaseRole = {
  title: string;
  goal: string;
  facts: string[];
};

export type SimpleCase = {
  key: string;
  title: string;
  description: string;
  truth: string;
  evidence: string[];
  roles: Record<string, SimpleCaseRole>;
};

export type SimpleCasePack = {
  key: string;
  title: string;
  description: string;
  isAdult: boolean;
  sortOrder: number;
  casesByPlayers: Record<3 | 4 | 5 | 6, SimpleCase[]>;
};

/*
================================================================================
ВРЕМЕННОЕ ХРАНИЛИЩЕ ВСЕХ ДЕЛ (БЕЗ БД)
================================================================================

КУДА ДОБАВЛЯТЬ ПАКИ И ДЕЛА:
- Только в массив BACKEND_CASE_PACKS ниже.
- Для каждого пака заполняй casesByPlayers: 3/4/5/6.

ПОРЯДОК РАБОТЫ:
1) Скопируй TEMPLATE_PACK_A или TEMPLATE_PACK_B.
2) Поменяй key/title/description.
3) Добавь дела по образцу.

ВАЖНО:
- key пака должен быть уникальным.
- key дела должен быть уникальным внутри пака.
*/

function normalizeLegacyCasesByPlayers(): Record<3 | 4 | 5 | 6, SimpleCase[]> {
  const result: Record<3 | 4 | 5 | 6, SimpleCase[]> = {
    3: [],
    4: [],
    5: [],
    6: [],
  };

  const counts: Array<3 | 4 | 5 | 6> = [3, 4, 5, 6];
  for (const count of counts) {
    const source = (legacyCases[count] ?? []) as Array<any>;
    result[count] = source.map((item, index) => ({
      key:
        typeof item?.id === "string" && item.id.trim()
          ? item.id.trim()
          : `classic_${count}_${index + 1}`,
      title: typeof item?.title === "string" ? item.title : `Дело ${index + 1}`,
      description: typeof item?.description === "string" ? item.description : "",
      truth: typeof item?.truth === "string" ? item.truth : "",
      evidence: Array.isArray(item?.evidence)
        ? item.evidence.filter((x: unknown): x is string => typeof x === "string")
        : [],
      roles: item?.roles && typeof item.roles === "object" ? item.roles : {},
    }));
  }

  return result;
}

const TEMPLATE_PACK_A: SimpleCasePack = {
  key: "template_pack_a",
  title: "ШАБЛОН ПАКА A",
  description: "Переименуй и добавь свои дела.",
  isAdult: false,
  sortOrder: 200,
  casesByPlayers: {
    3: [
      {
        key: "template_a_3_1",
        title: "Шаблон дела A (3 игрока)",
        description: "Описание конфликта.",
        truth: "Истина дела.",
        evidence: ["Улика 1", "Улика 2"],
        roles: {
          plaintiff: {
            title: "Истец",
            goal: "Цель истца",
            facts: ["Факт 1", "Факт 2"],
          },
          defendant: {
            title: "Ответчик",
            goal: "Цель ответчика",
            facts: ["Факт 1", "Факт 2"],
          },
          judge: {
            title: "Судья",
            goal: "Вынести верный вердикт",
            facts: [],
          },
        },
      },
    ],
    4: [],
    5: [],
    6: [],
  },
};

const TEMPLATE_PACK_B: SimpleCasePack = {
  key: "template_pack_b",
  title: "ШАБЛОН ПАКА B",
  description: "Второй шаблон для примера структуры.",
  isAdult: false,
  sortOrder: 210,
  casesByPlayers: {
    3: [],
    4: [
      {
        key: "template_b_4_1",
        title: "Шаблон дела B (4 игрока)",
        description: "Описание для режима 4.",
        truth: "Истина дела B.",
        evidence: ["Улика A", "Улика B"],
        roles: {
          plaintiff: {
            title: "Истец",
            goal: "Цель истца",
            facts: ["Факт 1", "Факт 2"],
          },
          defendant: {
            title: "Ответчик",
            goal: "Цель ответчика",
            facts: ["Факт 1", "Факт 2"],
          },
          defenseLawyer: {
            title: "Адвокат ответчика",
            goal: "Защита ответчика",
            facts: ["Факт 1", "Факт 2"],
          },
          judge: {
            title: "Судья",
            goal: "Вынести верный вердикт",
            facts: [],
          },
        },
      },
    ],
    5: [],
    6: [],
  },
};

export const BACKEND_CASE_PACKS: SimpleCasePack[] = [
  {
    key: "classic",
    title: "КЛАССИКА",
    description: "Основной пул дел CourtGame (временно хранится в backend-файле).",
    isAdult: false,
    sortOrder: 10,
    casesByPlayers: normalizeLegacyCasesByPlayers(),
  },
  TEMPLATE_PACK_A,
  TEMPLATE_PACK_B,
];
