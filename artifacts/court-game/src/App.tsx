import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  Gavel,
  Scale,
  UserPlus,
  UserX,
  Play,
  Eye,
  Shield,
  AlertCircle,
  Sparkles,
  Camera,
  CircleHelp,
  Gamepad2,
  Search,
  Wrench,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const stages = [
  "РџРѕРґРіРѕС‚РѕРІРєР°",
  "Р’С‹СЃС‚СѓРїР»РµРЅРёРµ РёСЃС‚С†Р° / РїРѕС‚РµСЂРїРµРІС€РµРіРѕ",
  "Р’С‹СЃС‚СѓРїР»РµРЅРёРµ РѕС‚РІРµС‚С‡РёРєР° / РѕР±РІРёРЅСЏРµРјРѕРіРѕ",
  "Р”РѕРїСЂРѕСЃ Рё РёСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ РєР°СЂС‚",
  "Р¤РёРЅР°Р»СЊРЅС‹Рµ СЂРµС‡Рё",
  "Р РµС€РµРЅРёРµ СЃСѓРґСЊРё",
];

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
  exit: { opacity: 0, y: -12, transition: { duration: 0.22, ease: "easeIn" } },
};

const cardVariants = {
  initial: { opacity: 0, y: 24 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, delay: i * 0.07, ease: "easeOut" },
  }),
};

const entryVariants = {
  initial: { opacity: 0, scale: 0.92, y: 18 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.88,
    x: -24,
    transition: { duration: 0.22, ease: "easeIn" },
  },
};

const floatingHelpButtonVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 420, damping: 28, mass: 0.7 },
  },
  exit: {
    opacity: 0,
    y: 16,
    scale: 0.95,
    transition: { duration: 0.18, ease: "easeInOut" },
  },
};

interface DevLogEntry {
  date: string;
  version: string;
  title: string;
  changes: string[];
}

const CURRENT_VERSION = "Beta 0.2";

const DEVLOG_ENTRIES: DevLogEntry[] = [
  {
    date: "19.03.2026",
    version: CURRENT_VERSION,
    title: "РЎС‚Р°Р±РёР»РёР·Р°С†РёСЏ Р»РѕР±Р±Рё Рё СЂР°СЃС€РёСЂРµРЅРёРµ РёРіСЂРѕРІС‹С… РјРµС…Р°РЅРёРє",
    changes: [
      "Р”РѕР±Р°РІР»РµРЅС‹ Р°РІР°С‚Р°СЂРєРё РёРіСЂРѕРєРѕРІ СЃ РѕС‚РѕР±СЂР°Р¶РµРЅРёРµРј РІ Р»РѕР±Р±Рё Рё РІРѕ РІСЂРµРјСЏ РјР°С‚С‡Р°.",
      "Р”РѕР±Р°РІР»РµРЅ РїРµСЂРµРєР»СЋС‡Р°С‚РµР»СЊ В«РЇ вЂ” РЎСѓРґСЊСЏВ» РґР»СЏ РІРµРґСѓС‰РµРіРѕ РІ Р»РѕР±Р±Рё.",
      "Р”РѕР±Р°РІР»РµРЅР° СЂРѕР»СЊ РЅР°Р±Р»СЋРґР°С‚РµР»СЏ В«РЎРІРёРґРµС‚РµР»СЊВ» РґР»СЏ РїРѕРґРєР»СЋС‡РµРЅРёСЏ РІ СѓР¶Рµ РёРґСѓС‰РёР№ РјР°С‚С‡.",
      "Р’РµРґСѓС‰РёР№ РјРѕР¶РµС‚ РєРёРєР°С‚СЊ РёРіСЂРѕРєРѕРІ РёР· Р»РѕР±Р±Рё СЃ СѓРІРµРґРѕРјР»РµРЅРёРµРј Рѕ РєРёРєРµ.",
      "Р”РѕР±Р°РІР»РµРЅР° РїРѕРґСЃРІРµС‚РєР° РїРѕСЃР»РµРґРЅРµРіРѕ СЂР°СЃРєСЂС‹С‚РѕРіРѕ С„Р°РєС‚Р° Рё РїРѕСЃР»РµРґРЅРµР№ РјРµС…Р°РЅРёРєРё.",
      "Р’Рѕ РІСЃС‚СѓРїРёС‚РµР»СЊРЅРѕР№ СЂРµС‡Рё РѕРіСЂР°РЅРёС‡РµРЅРёРµ: РјРѕР¶РЅРѕ СЂР°СЃРєСЂС‹С‚СЊ РЅРµ Р±РѕР»РµРµ 2 С„Р°РєС‚РѕРІ.",
      "РќР° СЌС‚Р°РїРµ В«РџРѕРґРіРѕС‚РѕРІРєР°В» РѕС‚РєР»СЋС‡РµРЅРѕ СЂР°СЃРєСЂС‹С‚РёРµ С„Р°РєС‚РѕРІ Рё РїСЂРёРјРµРЅРµРЅРёРµ РјРµС…Р°РЅРёРє.",
    ],
  },
];

interface HelpTopic {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
}

interface HelpTopicDraft {
  id?: string;
  category: string;
  title: string;
  content: string | string[];
  keywords?: string[] | string;
}

// How to add new help data quickly:
// 1) Add an object in HELP_TOPICS_SOURCE with category/title/content.
// 2) "id" and "keywords" are optional and will be generated automatically.
const HELP_TOPICS_SOURCE: HelpTopicDraft[] = [
  {
    id: "role-judge",
    category: "Р РѕР»Рё",
    title: "РЎСѓРґСЊСЏ",
    content:
      "Р’РµРґРµС‚ РїСЂРѕС†РµСЃСЃ, РєРѕРЅС‚СЂРѕР»РёСЂСѓРµС‚ СЌС‚Р°РїС‹ Рё РІС‹РЅРѕСЃРёС‚ С„РёРЅР°Р»СЊРЅС‹Р№ РІРµСЂРґРёРєС‚.",
    keywords: ["СЃСѓРґСЊСЏ", "РІРµСЂРґРёРєС‚", "СЌС‚Р°РїС‹", "СЂРѕР»СЊ"],
  },
  {
    id: "role-prosecutor",
    category: "Р РѕР»Рё",
    title: "РџСЂРѕРєСѓСЂРѕСЂ",
    content:
      "РЎС‚СЂРѕРёС‚ Р»РёРЅРёСЋ РѕР±РІРёРЅРµРЅРёСЏ, СЂР°СЃРєСЂС‹РІР°РµС‚ С„Р°РєС‚С‹ Рё СѓСЃРёР»РёРІР°РµС‚ РїРѕР·РёС†РёСЋ СЃРІРѕРµР№ СЃС‚РѕСЂРѕРЅС‹.",
    keywords: ["РїСЂРѕРєСѓСЂРѕСЂ", "РѕР±РІРёРЅРµРЅРёРµ", "СЂРѕР»СЊ"],
  },
  {
    id: "role-plaintiff",
    category: "Р РѕР»Рё",
    title: "РСЃС‚РµС†",
    content:
      "Р¤РѕСЂРјСѓР»РёСЂСѓРµС‚ С‚СЂРµР±РѕРІР°РЅРёСЏ Рё РґРѕРєР°Р·С‹РІР°РµС‚, РїРѕС‡РµРјСѓ РїРѕР·РёС†РёСЏ РёСЃС‚С†Р° РѕР±РѕСЃРЅРѕРІР°РЅР°.",
    keywords: ["РёСЃС‚РµС†", "С‚СЂРµР±РѕРІР°РЅРёСЏ", "СЂРѕР»СЊ"],
  },
  {
    id: "role-defendant",
    category: "Р РѕР»Рё",
    title: "РћС‚РІРµС‚С‡РёРє",
    content:
      "Р—Р°С‰РёС‰Р°РµС‚ РїРѕР·РёС†РёСЋ, РѕРїСЂРѕРІРµСЂРіР°РµС‚ РїСЂРµС‚РµРЅР·РёРё Рё СЂР°СЃРєСЂС‹РІР°РµС‚ РІС‹РіРѕРґРЅС‹Рµ С„Р°РєС‚С‹.",
    keywords: ["РѕС‚РІРµС‚С‡РёРє", "Р·Р°С‰РёС‚Р°", "СЂРѕР»СЊ"],
  },
  {
    id: "role-plaintiff-lawyer",
    category: "Р РѕР»Рё",
    title: "РђРґРІРѕРєР°С‚ РёСЃС‚С†Р°",
    content:
      "РџРѕРґРґРµСЂР¶РёРІР°РµС‚ РёСЃС‚С†Р° Рё РІС‹СЃС‚СЂР°РёРІР°РµС‚ Р°СЂРіСѓРјРµРЅС‚Р°С†РёСЋ РІ РїРѕР»СЊР·Сѓ РµРіРѕ С‚СЂРµР±РѕРІР°РЅРёР№.",
    keywords: ["Р°РґРІРѕРєР°С‚ РёСЃС‚С†Р°", "РёСЃС‚РµС†", "СЂРѕР»СЊ"],
  },
  {
    id: "role-defendant-lawyer",
    category: "Р РѕР»Рё",
    title: "РђРґРІРѕРєР°С‚ РѕС‚РІРµС‚С‡РёРєР°",
    content:
      "РџРѕРґРґРµСЂР¶РёРІР°РµС‚ РѕС‚РІРµС‚С‡РёРєР° Рё РёС‰РµС‚ СЃР»Р°Р±С‹Рµ РјРµСЃС‚Р° РІ РїРѕР·РёС†РёРё РѕРїРїРѕРЅРµРЅС‚Р°.",
    keywords: ["Р°РґРІРѕРєР°С‚ РѕС‚РІРµС‚С‡РёРєР°", "РѕС‚РІРµС‚С‡РёРє", "СЂРѕР»СЊ"],
  },
  {
    id: "cards-what",
    category: "РљР°СЂС‚С‹ РјРµС…Р°РЅРёРє",
    title: "Р§С‚Рѕ СЌС‚Рѕ",
    content:
      "РљР°СЂС‚С‹ РјРµС…Р°РЅРёРє вЂ” СЃРїРµС†РёР°Р»СЊРЅС‹Рµ СЌС„С„РµРєС‚С‹, РєРѕС‚РѕСЂС‹Рµ РІСЂРµРјРµРЅРЅРѕ РјРµРЅСЏСЋС‚ РїСЂР°РІРёР»Р° СЂРµРїР»РёРєРё.",
    keywords: ["РєР°СЂС‚С‹ РјРµС…Р°РЅРёРє", "С‡С‚Рѕ СЌС‚Рѕ", "РјРµС…Р°РЅРёРєРё"],
  },
  {
    id: "cards-how",
    category: "РљР°СЂС‚С‹ РјРµС…Р°РЅРёРє",
    title: "РљР°Рє РёСЃРїРѕР»СЊР·СѓСЋС‚СЃСЏ",
    content:
      "РќР°Р¶РјРёС‚Рµ В«РџСЂРёРјРµРЅРёС‚СЊВ» Сѓ РєР°СЂС‚С‹. РџРѕСЃР»Рµ РїСЂРёРјРµРЅРµРЅРёСЏ РѕРЅР° СЃС‚Р°РЅРѕРІРёС‚СЃСЏ РёСЃРїРѕР»СЊР·РѕРІР°РЅРЅРѕР№.",
    keywords: ["РєР°СЂС‚С‹ РјРµС…Р°РЅРёРє", "РїСЂРёРјРµРЅРёС‚СЊ", "РёСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ"],
  },
  {
    id: "cards-when",
    category: "РљР°СЂС‚С‹ РјРµС…Р°РЅРёРє",
    title: "РљРѕРіРґР° РїСЂРёРјРµРЅСЏСЋС‚СЃСЏ",
    content:
      "РќР° В«РџРѕРґРіРѕС‚РѕРІРєРµВ» РєР°СЂС‚С‹ РЅРµРґРѕСЃС‚СѓРїРЅС‹. Р’ РѕСЃС‚Р°Р»СЊРЅС‹С… СЌС‚Р°РїР°С… вЂ” РїРѕ СЃРёС‚СѓР°С†РёРё Рё С‚Р°Р№РјРёРЅРіСѓ.",
    keywords: ["РєР°СЂС‚С‹ РјРµС…Р°РЅРёРє", "РєРѕРіРґР°", "РїРѕРґРіРѕС‚РѕРІРєР°"],
  },
  {
    id: "facts-what",
    category: "Р¤Р°РєС‚С‹",
    title: "Р§С‚Рѕ СЌС‚Рѕ",
    content:
      "Р¤Р°РєС‚С‹ вЂ” СЌС‚Рѕ Р·Р°РєСЂС‹С‚Р°СЏ РёРЅС„РѕСЂРјР°С†РёСЏ СЂРѕР»Рё, РєРѕС‚РѕСЂР°СЏ СЂР°СЃРєСЂС‹РІР°РµС‚СЃСЏ РїРѕ С…РѕРґСѓ РїСЂРѕС†РµСЃСЃР°.",
    keywords: ["С„Р°РєС‚С‹", "С‡С‚Рѕ СЌС‚Рѕ"],
  },
  {
    id: "facts-reveal",
    category: "Р¤Р°РєС‚С‹",
    title: "РљР°Рє СЂР°СЃРєСЂС‹РІР°СЋС‚СЃСЏ",
    content:
      "Р¤Р°РєС‚С‹ СЂР°СЃРєСЂС‹РІР°СЋС‚СЃСЏ РєРЅРѕРїРєРѕР№ В«Р Р°СЃРєСЂС‹С‚СЊВ». РќР° В«РџРѕРґРіРѕС‚РѕРІРєРµВ» Р·Р°РїСЂРµС‰РµРЅРѕ СЂР°СЃРєСЂС‹С‚РёРµ.",
    keywords: ["С„Р°РєС‚С‹", "СЂР°СЃРєСЂС‹С‚СЊ", "РїРѕРґРіРѕС‚РѕРІРєР°"],
  },
  {
    id: "facts-impact",
    category: "Р¤Р°РєС‚С‹",
    title: "РљР°Рє РІР»РёСЏСЋС‚",
    content:
      "Р Р°СЃРєСЂС‹С‚С‹Рµ С„Р°РєС‚С‹ РІРёРґСЏС‚ РІСЃРµ СѓС‡Р°СЃС‚РЅРёРєРё. РћРЅРё РЅР°РїСЂСЏРјСѓСЋ РІР»РёСЏСЋС‚ РЅР° РѕС†РµРЅРєСѓ СЃСѓРґСЊРё.",
    keywords: ["С„Р°РєС‚С‹", "РІР»РёСЏРЅРёРµ", "СЃСѓРґСЊСЏ"],
  },
  {
    id: "court-flow",
    category: "РљР°Рє РїСЂРѕС…РѕРґРёС‚ СЃСѓРґ",
    title: "Р­С‚Р°РїС‹ РёРіСЂС‹",
    content:
      "РџРѕРґРіРѕС‚РѕРІРєР° в†’ РІСЃС‚СѓРїРёС‚РµР»СЊРЅР°СЏ СЂРµС‡СЊ в†’ РїСЂРµРЅРёСЏ/РґРѕРїСЂРѕСЃ/РєР°СЂС‚С‹ в†’ Р·Р°РєР»СЋС‡РёС‚РµР»СЊРЅР°СЏ СЂРµС‡СЊ в†’ СЂРµС€РµРЅРёРµ СЃСѓРґСЊРё.",
    keywords: ["СЌС‚Р°РїС‹", "РїРѕСЂСЏРґРѕРє РјР°С‚С‡Р°", "РєР°Рє РїСЂРѕС…РѕРґРёС‚ СЃСѓРґ"],
  },
  {
    id: "opening",
    category: "РљР°Рє РїСЂРѕС…РѕРґРёС‚ СЃСѓРґ",
    title: "Р’СЃС‚СѓРїРёС‚РµР»СЊРЅР°СЏ СЂРµС‡СЊ",
    content:
      "РЎС‚РѕСЂРѕРЅС‹ РѕР±РѕР·РЅР°С‡Р°СЋС‚ РїРѕР·РёС†РёРё. РќР° СЌС‚РѕРј СЌС‚Р°РїРµ РґРѕСЃС‚СѓРїРЅРѕ РЅРµ Р±РѕР»РµРµ 2 СЂР°СЃРєСЂС‹С‚С‹С… С„Р°РєС‚РѕРІ.",
    keywords: ["РІСЃС‚СѓРїРёС‚РµР»СЊРЅР°СЏ СЂРµС‡СЊ", "СЌС‚Р°Рї"],
  },
  {
    id: "arguments",
    category: "РљР°Рє РїСЂРѕС…РѕРґРёС‚ СЃСѓРґ",
    title: "РџСЂРµРЅРёСЏ СЃС‚РѕСЂРѕРЅ",
    content:
      "РћСЃРЅРѕРІРЅРѕР№ РѕР±РјРµРЅ Р°СЂРіСѓРјРµРЅС‚Р°РјРё. Р’Р°Р¶РЅРѕ СЃРѕС‡РµС‚Р°С‚СЊ С„Р°РєС‚С‹ Рё РєР°СЂС‚С‹ РјРµС…Р°РЅРёРє.",
    keywords: ["РїСЂРµРЅРёСЏ СЃС‚РѕСЂРѕРЅ", "Р°СЂРіСѓРјРµРЅС‚С‹"],
  },
  {
    id: "closing",
    category: "РљР°Рє РїСЂРѕС…РѕРґРёС‚ СЃСѓРґ",
    title: "Р—Р°РєР»СЋС‡РёС‚РµР»СЊРЅР°СЏ СЂРµС‡СЊ",
    content:
      "Р¤РёРЅР°Р»СЊРЅРѕРµ РєСЂР°С‚РєРѕРµ СЂРµР·СЋРјРµ РїРѕР·РёС†РёР№ СЃС‚РѕСЂРѕРЅ РїРµСЂРµРґ РІС‹РЅРµСЃРµРЅРёРµРј СЂРµС€РµРЅРёСЏ.",
    keywords: ["Р·Р°РєР»СЋС‡РёС‚РµР»СЊРЅР°СЏ СЂРµС‡СЊ", "С„РёРЅР°Р»"],
  },
  {
    id: "protests",
    category: "РљР°Рє РїСЂРѕС…РѕРґРёС‚ СЃСѓРґ",
    title: "РџСЂРѕС‚РµСЃС‚С‹",
    content:
      "Р•СЃР»Рё СЃС‚РѕСЂРѕРЅР° СЃС‡РёС‚Р°РµС‚ РґРµР№СЃС‚РІРёРµ РѕРїРїРѕРЅРµРЅС‚Р° РЅРµРєРѕСЂСЂРµРєС‚РЅС‹Рј, Р·Р°СЏРІР»СЏРµС‚СЃСЏ РїСЂРѕС‚РµСЃС‚, СЂРµС€РµРЅРёРµ РїСЂРёРЅРёРјР°РµС‚ СЃСѓРґСЊСЏ.",
    keywords: ["РїСЂРѕС‚РµСЃС‚С‹", "РїСЂР°РІРёР»Р°", "СЃСѓРґСЊСЏ"],
  },
];

function normalizeHelpContent(content: string | string[]): string {
  return Array.isArray(content)
    ? content.map((line) => line.trim()).filter(Boolean).join("\n\n")
    : content;
}

function normalizeHelpKeywords(
  keywords: string[] | string | undefined,
): string[] {
  if (!keywords) return [];
  if (Array.isArray(keywords)) return keywords;
  return keywords
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildHelpTopicId(topic: HelpTopicDraft, index: number): string {
  return topic.id ?? `help-topic-${index + 1}`;
}

const HELP_TOPICS: HelpTopic[] = HELP_TOPICS_SOURCE.map((topic, index) => ({
  id: buildHelpTopicId(topic, index),
  category: topic.category,
  title: topic.title,
  content: normalizeHelpContent(topic.content),
  keywords: normalizeHelpKeywords(topic.keywords),
}));

const HELP_CATEGORY_ORDER = Array.from(
  new Set(HELP_TOPICS.map((topic) => topic.category)),
);

function normalizeHelpText(text: string): string {
  return text.toLowerCase().trim();
}

function isHelpTopicMatch(topic: HelpTopic, query: string): boolean {
  if (!query.trim()) return true;
  const normalized = normalizeHelpText(query);
  const fullText = normalizeHelpText(
    `${topic.title} ${topic.content} ${topic.keywords.join(" ")}`,
  );
  return fullText.includes(normalized);
}

function HelpCenter({
  query,
  onQueryChange,
  compact = false,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  compact?: boolean;
}) {
  const filteredTopics = useMemo(
    () => HELP_TOPICS.filter((topic) => isHelpTopicMatch(topic, query)),
    [query],
  );

  const groupedTopics = useMemo(
    () =>
      HELP_CATEGORY_ORDER.map((category) => ({
        category,
        items: filteredTopics.filter((item) => item.category === category),
      })).filter((group) => group.items.length > 0),
    [filteredTopics],
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="РџРѕРёСЃРє РїРѕ РїРѕРјРѕС‰Рё..."
          className={`pl-10 rounded-xl border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-red-500 ${
            compact ? "h-10" : "h-11"
          }`}
        />
      </div>

      {filteredTopics.length === 0 ? (
        <Card className="rounded-2xl border-zinc-800 bg-zinc-900/80 text-zinc-100">
          <CardContent className="p-5 text-sm text-zinc-400">
            РќРёС‡РµРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РґСЂСѓРіРѕР№ Р·Р°РїСЂРѕСЃ.
          </CardContent>
        </Card>
      ) : (
        groupedTopics.map((group) => (
          <Card
            key={group.category}
            className="rounded-2xl border-zinc-800 bg-zinc-900/80 text-zinc-100"
          >
            <CardHeader className={compact ? "pb-2 pt-4" : "pb-2"}>
              <CardTitle className={compact ? "text-base" : "text-lg"}>
                <span className="flex items-center gap-2">
                  {group.category}
                  <Badge className="bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {group.items.length}
                  </Badge>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className={compact ? "pt-0 pb-4" : "pt-0"}>
              <Accordion
                type="multiple"
                className="w-full"
                defaultValue={group.items.map((item) => item.id)}
              >
                {group.items.map((item) => (
                  <AccordionItem
                    key={item.id}
                    value={item.id}
                    className="border-zinc-800"
                  >
                    <AccordionTrigger className="text-zinc-100 hover:no-underline">
                      {item.title}
                    </AccordionTrigger>
                    <AccordionContent className="text-zinc-400 leading-relaxed whitespace-pre-line">
                      {item.content}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

interface PlayerInfo {
  id: string;
  name: string;
  avatar?: string;
  roleKey?: string;
  roleTitle?: string;
}

interface Fact {
  id: string;
  text: string;
  revealed: boolean;
}

interface Card_ {
  id: string;
  name: string;
  description: string;
  used: boolean;
}

interface RevealedFact {
  id: string;
  ownerId?: string;
  text: string;
  owner: string;
  ownerRole: string;
  stageIndex?: number;
}

interface UsedCard {
  id: string;
  ownerId?: string;
  owner: string;
  ownerRole: string;
  name: string;
  description: string;
}

interface MyPlayer {
  id: string;
  name: string;
  avatar?: string;
  roleKey: string;
  roleTitle: string;
  goal: string;
  facts: Fact[];
  cards: Card_[];
}

interface GameState {
  caseData: {
    mode: string;
    title: string;
    description: string;
    truth: string;
    evidence: string[];
  };
  players: PlayerInfo[];
  stageIndex: number;
  revealedFacts: RevealedFact[];
  usedCards: UsedCard[];
  finished: boolean;
  verdict: string;
  verdictEvaluation: string;
  me: MyPlayer | null;
  code: string;
  hostId: string;
}

interface RoomState {
  code: string;
  hostId: string;
  players: PlayerInfo[];
  started: boolean;
  isHostJudge?: boolean;
}

function Avatar({
  src,
  name,
  size = 32,
}: {
  src: string | null;
  name: string;
  size?: number;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="rounded-full object-cover flex-shrink-0 border border-zinc-700"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name ? name.slice(0, 2).toUpperCase() : "??";
  return (
    <div
      className="rounded-full bg-zinc-700 text-zinc-200 flex items-center justify-center flex-shrink-0 text-xs font-bold border border-zinc-600"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

function PlayerCard({
  player,
  isHost,
  canKick = false,
  onKick,
}: {
  player: PlayerInfo;
  isHost: boolean;
  canKick?: boolean;
  onKick?: () => void;
}) {
  return (
    <motion.div variants={cardVariants} initial="initial" animate="animate">
      <Card className="rounded-2xl shadow-sm bg-zinc-900/90 border-zinc-800 text-zinc-100">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar src={player.avatar ?? null} name={player.name} size={52} />
            <div className="min-w-0">
              <div className="font-semibold text-base truncate">{player.name}</div>
              <div className="text-sm text-zinc-400">
                {isHost ? "Р’РµРґСѓС‰РёР№ РєРѕРјРЅР°С‚С‹" : "РРіСЂРѕРє"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={
                isHost
                  ? "bg-red-600 text-white border-0"
                  : "bg-zinc-800 text-zinc-100 border border-zinc-700"
              }
            >
              {isHost ? "Host" : "Player"}
            </Badge>
            {canKick && onKick && (
              <Button
                size="sm"
                className="h-8 rounded-full px-3 gap-1.5 bg-red-600/90 hover:bg-red-500 text-white border-0 shadow-sm shadow-red-900/30"
                onClick={onKick}
              >
                <UserX className="w-3.5 h-3.5" />
                Kick
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function InfoBlock({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl shadow-sm h-full bg-zinc-900/90 border-zinc-800 text-zinc-100">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-lg text-zinc-100">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          {action}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-zinc-100">{children}</CardContent>
    </Card>
  );
}

type HomeTab = "play" | "development" | "help";

function ContextHelp({
  open,
  onOpenChange,
  query,
  onQueryChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <motion.button
          type="button"
          variants={floatingHelpButtonVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className={`fixed right-5 bottom-5 left-auto z-40 h-11 rounded-2xl px-3.5 inline-flex items-center gap-2 border backdrop-blur-md shadow-[0_12px_30px_rgba(0,0,0,0.45)] transition-colors ${
            open
              ? "border-red-500/55 bg-red-950/75 text-red-100"
              : "border-zinc-700 bg-zinc-900/90 text-zinc-100 hover:bg-zinc-900 hover:border-zinc-500"
          }`}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm shadow-red-900/50">
            <CircleHelp className="w-3.5 h-3.5" />
          </span>
          РџРѕРјРѕС‰СЊ
        </motion.button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl p-0 border-zinc-800 bg-zinc-950 text-zinc-100 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-2 duration-200">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-zinc-100">РџРѕРјРѕС‰СЊ РїРѕ РёРіСЂРµ</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 max-h-[75vh] overflow-y-auto">
          <HelpCenter
            query={query}
            onQueryChange={onQueryChange}
            compact
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function App() {
  const [screen, setScreen] = useState<"setup" | "home" | "room" | "game">(
    "home",
  );
  const [homeTab, setHomeTab] = useState<HomeTab>("play");
  const [mainHelpQuery, setMainHelpQuery] = useState("");
  const [contextHelpOpen, setContextHelpOpen] = useState(false);
  const [contextHelpQuery, setContextHelpQuery] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [disconnectAlert, setDisconnectAlert] = useState("");
  const [rejoinAlert, setRejoinAlert] = useState("");
  const [kickedAlert, setKickedAlert] = useState("");
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
  const [startGameLoading, setStartGameLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const [myId, setMyId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [showFactHistory, setShowFactHistory] = useState(false);
  const [isHostJudge, setIsHostJudge] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const socket = getSocket();

  useEffect(() => {
    const savedName = localStorage.getItem("court_nickname");
    const savedAvatar = localStorage.getItem("court_avatar");
    if (savedAvatar) setAvatar(savedAvatar);

    if (savedName) {
      setPlayerName(savedName);
      const sessionCode = localStorage.getItem("court_session");
      if (sessionCode) {
        setHasSession(true);
        socket.emit("rejoin_room", {
          code: sessionCode,
          playerName: savedName,
        });
      }
    } else {
      setScreen("setup");
    }
  }, []);

  useEffect(() => {
    socket.on(
      "room_joined",
      ({ playerId, state }: { playerId: string; state: any }) => {
        setMyId(playerId);
        localStorage.setItem("court_session", state.code);
        setHasSession(true);
        setStartGameLoading(false);
        if (avatar) {
          socket.emit("update_avatar", {
            code: state.code,
            playerId,
            avatar,
          });
        }
        if (state.type === "room") {
          const roomState = state as RoomState;
          setRoom({
            ...roomState,
            players: roomState.players.map((p) =>
              p.id === playerId && avatar ? { ...p, avatar } : p,
            ),
          });
          setIsHostJudge(state.isHostJudge ?? false);
          setGame(null);
          setScreen("room");
        } else {
          const gameState = state as GameState;
          setGame({
            ...gameState,
            players: gameState.players.map((p) =>
              p.id === playerId && avatar ? { ...p, avatar } : p,
            ),
            me:
              gameState.me && avatar
                ? { ...gameState.me, avatar }
                : gameState.me,
          });
          setRoom(null);
          setScreen("game");
        }
      },
    );

    socket.on(
      "room_updated",
      ({ players, hostId, isHostJudge: hj }: { players: PlayerInfo[]; hostId: string; isHostJudge?: boolean }) => {
        setRoom((prev) => {
          if (!prev) return prev;
          const mergedPlayers = players.map((nextPlayer) => {
            const prevPlayer = prev.players.find((p) => p.id === nextPlayer.id);
            return {
              ...nextPlayer,
              avatar: nextPlayer.avatar ?? prevPlayer?.avatar,
            };
          });
          return { ...prev, players: mergedPlayers, hostId };
        });
        if (hj !== undefined) setIsHostJudge(hj);
      },
    );

    socket.on("game_players_updated", ({ players }: { players: PlayerInfo[] }) => {
      setGame((prev) => {
        if (!prev) return prev;
        const mergedPlayers = players.map((nextPlayer) => {
          const prevPlayer = prev.players.find((p) => p.id === nextPlayer.id);
          return {
            ...nextPlayer,
            avatar: nextPlayer.avatar ?? prevPlayer?.avatar,
          };
        });

        if (!prev.me) {
          return { ...prev, players: mergedPlayers };
        }

        const updatedSelf = mergedPlayers.find((p) => p.id === prev.me!.id);
        return {
          ...prev,
          players: mergedPlayers,
          me: updatedSelf
            ? {
                ...prev.me,
                avatar: updatedSelf.avatar ?? prev.me.avatar,
                roleKey: updatedSelf.roleKey ?? prev.me.roleKey,
                roleTitle: updatedSelf.roleTitle ?? prev.me.roleTitle,
              }
            : prev.me,
        };
      });
    });

    socket.on(
      "player_left",
      ({ playerName: name }: { playerId: string; playerName: string }) => {
        setDisconnectAlert(`вљ пёЏ ${name} РїРѕРєРёРЅСѓР» РёРіСЂСѓ`);
        setTimeout(() => setDisconnectAlert(""), 6000);
      },
    );

    socket.on(
      "player_rejoined",
      ({ playerName: name }: { playerName: string }) => {
        setRejoinAlert(`${name} РІРµСЂРЅСѓР»СЃСЏ РІ РёРіСЂСѓ`);
        setTimeout(() => setRejoinAlert(""), 4000);
      },
    );

    socket.on("rejoin_failed", () => {
      localStorage.removeItem("court_session");
      setHasSession(false);
      setScreen("home");
    });

    socket.on("kicked", () => {
      localStorage.removeItem("court_session");
      setHasSession(false);
      setRoom(null);
      setGame(null);
      setMyId(null);
      setJoinCode("");
      setDisconnectAlert("");
      setRejoinAlert("");
      setCopiedRoomCode(false);
      setIsHostJudge(false);
      setStartGameLoading(false);
      setContextHelpOpen(false);
      setScreen("home");
      setKickedAlert(
        "\u0412\u044b \u0431\u044b\u043b\u0438 \u043a\u0438\u043a\u043d\u0443\u0442\u044b \u0438\u0437 \u043a\u043e\u043c\u043d\u0430\u0442\u044b.",
      );
      setTimeout(() => setKickedAlert(""), 5000);
    });

    socket.on("game_started", ({ state }: { state: any }) => {
      setStartGameLoading(false);
      setGame(state as GameState);
      setRoom(null);
      setScreen("game");
    });

    socket.on(
      "facts_updated",
      ({ revealedFacts }: { revealedFacts: RevealedFact[] }) => {
        setGame((prev) => (prev ? { ...prev, revealedFacts } : prev));
      },
    );

    socket.on("my_facts_updated", ({ facts }: { facts: Fact[] }) => {
      setGame((prev) =>
        prev && prev.me ? { ...prev, me: { ...prev.me, facts } } : prev,
      );
    });

    socket.on("cards_updated", ({ usedCards }: { usedCards: UsedCard[] }) => {
      setGame((prev) => (prev ? { ...prev, usedCards } : prev));
    });

    socket.on("my_cards_updated", ({ cards }: { cards: Card_[] }) => {
      setGame((prev) =>
        prev && prev.me ? { ...prev, me: { ...prev.me, cards } } : prev,
      );
    });

    socket.on("stage_updated", ({ stageIndex }: { stageIndex: number }) => {
      setGame((prev) => (prev ? { ...prev, stageIndex } : prev));
    });

    socket.on(
      "verdict_set",
      ({ verdict, verdictEvaluation, finished }: any) => {
        setGame((prev) =>
          prev ? { ...prev, verdict, verdictEvaluation, finished } : prev,
        );
      },
    );

    socket.on("error", ({ message }: { message: string }) => {
      setStartGameLoading(false);
      setError(message);
      setTimeout(() => setError(""), 4000);
    });

    return () => {
      socket.off("room_joined");
      socket.off("room_updated");
      socket.off("game_players_updated");
      socket.off("player_left");
      socket.off("player_rejoined");
      socket.off("rejoin_failed");
      socket.off("kicked");
      socket.off("game_started");
      socket.off("facts_updated");
      socket.off("my_facts_updated");
      socket.off("cards_updated");
      socket.off("my_cards_updated");
      socket.off("stage_updated");
      socket.off("verdict_set");
      socket.off("error");
    };
  }, [socket, avatar]);

  const createRoom = useCallback(() => {
    const name = playerName.trim() || "РРіСЂРѕРє";
    localStorage.setItem("court_nickname", name);
    socket.emit("create_room", { playerName: name });
  }, [socket, playerName]);

  const joinRoom = useCallback(() => {
    if (!joinCode.trim()) return;
    const name = playerName.trim() || "РРіСЂРѕРє";
    socket.emit("join_room", {
      code: joinCode.trim().toUpperCase(),
      playerName: name,
    });
  }, [socket, joinCode, playerName]);

  const reconnect = useCallback(() => {
    const savedName = localStorage.getItem("court_nickname");
    const sessionCode = localStorage.getItem("court_session");
    if (savedName && sessionCode) {
      socket.emit("rejoin_room", {
        code: sessionCode,
        playerName: savedName,
      });
    }
  }, [socket]);

  const startGame = useCallback(() => {
    if (!room || !myId) return;
    setStartGameLoading(true);
    socket.emit("start_game", { code: room.code, playerId: myId });
  }, [socket, room, myId]);

  const toggleHostJudge = useCallback((checked: boolean) => {
    if (!room || !myId) return;
    setIsHostJudge(checked);
    socket.emit("set_host_judge", { code: room.code, playerId: myId, isHostJudge: checked });
  }, [socket, room, myId]);

  const kickPlayerFromRoom = useCallback(
    (targetPlayerId: string) => {
      if (!room || !myId || myId !== room.hostId) return;
      socket.emit("kick_player", {
        code: room.code,
        playerId: myId,
        targetPlayerId,
      });
    },
    [socket, room, myId],
  );

  const revealFact = useCallback(
    (factId: string) => {
      if (!game || !myId) return;
      socket.emit("reveal_fact", { code: game.code, playerId: myId, factId });
    },
    [socket, game, myId],
  );

  const useCard = useCallback(
    (cardId: string) => {
      if (!game || !myId) return;
      socket.emit("use_card", { code: game.code, playerId: myId, cardId });
    },
    [socket, game, myId],
  );

  const advanceStage = useCallback(() => {
    if (!game || !myId) return;
    socket.emit("next_stage", { code: game.code, playerId: myId });
  }, [socket, game, myId]);

  const retreatStage = useCallback(() => {
    if (!game || !myId) return;
    socket.emit("prev_stage", { code: game.code, playerId: myId });
  }, [socket, game, myId]);

  const submitVerdict = useCallback(
    (verdict: string) => {
      if (!game || !myId) return;
      socket.emit("set_verdict", { code: game.code, playerId: myId, verdict });
    },
    [socket, game, myId],
  );

  const resetAll = useCallback(() => {
    socket.emit("leave_room");
    setScreen("home");
    setRoom(null);
    setGame(null);
    setMyId(null);
    setJoinCode("");
    setDisconnectAlert("");
    setRejoinAlert("");
    setKickedAlert("");
    setCopiedRoomCode(false);
    setIsHostJudge(false);
    setStartGameLoading(false);
    setContextHelpOpen(false);
  }, [socket]);

  const finalExit = useCallback(() => {
    socket.emit("leave_room");
    localStorage.removeItem("court_session");
    setHasSession(false);
    setScreen("home");
    setRoom(null);
    setGame(null);
    setMyId(null);
    setJoinCode("");
    setKickedAlert("");
    setCopiedRoomCode(false);
    setStartGameLoading(false);
    setContextHelpOpen(false);
  }, [socket]);

  const setupNickname = useCallback(() => {
    const name = playerName.trim();
    if (!name) return;
    localStorage.setItem("court_nickname", name);
    setScreen("home");
  }, [playerName]);

  const compressAvatar = useCallback(
    (inputDataUrl: string): Promise<string> =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const maxSide = 256;
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(inputDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.78));
        };
        img.onerror = () => resolve(inputDataUrl);
        img.src = inputDataUrl;
      }),
    [],
  );

  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const compactAvatar = await compressAvatar(dataUrl);
        setAvatar(compactAvatar);
        localStorage.setItem("court_avatar", compactAvatar);
      };
      reader.readAsDataURL(file);
    },
    [compressAvatar],
  );

  const copyCode = useCallback((code: string) => {
    if (!navigator.clipboard) {
      setError("РќРµ СѓРґР°Р»РѕСЃСЊ СЃРєРѕРїРёСЂРѕРІР°С‚СЊ РєРѕРґ РєРѕРјРЅР°С‚С‹.");
      setTimeout(() => setError(""), 4000);
      return;
    }
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopiedRoomCode(true);
        setTimeout(() => setCopiedRoomCode(false), 2000);
      })
      .catch(() => {
        setError("РќРµ СѓРґР°Р»РѕСЃСЊ СЃРєРѕРїРёСЂРѕРІР°С‚СЊ РєРѕРґ РєРѕРјРЅР°С‚С‹.");
        setTimeout(() => setError(""), 4000);
      });
  }, []);

  if (screen === "setup") {
    return (
      <motion.div
        key="setup"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6"
      >
        <div className="w-full max-w-sm space-y-4">
          <Card className="rounded-[28px] border-zinc-800 bg-zinc-900/95 text-zinc-100">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2 text-center">
                <Badge className="rounded-full px-3 py-1 text-sm bg-red-600/90 text-white border-0">
                  РЎРЈР”
                </Badge>
                <h1 className="text-2xl font-bold pt-2">Р”РѕР±СЂРѕ РїРѕР¶Р°Р»РѕРІР°С‚СЊ!</h1>
                <p className="text-sm text-zinc-400">
                  РџСЂРёРґСѓРјР°Р№С‚Рµ РЅРёРєРЅРµР№Рј вЂ” РѕРЅ СЃРѕС…СЂР°РЅРёС‚СЃСЏ Рё Р±СѓРґРµС‚ РїСЂРёРІСЏР·Р°РЅ Рє РІР°Рј РІ
                  РєР°Р¶РґРѕР№ РёРіСЂРµ.
                </p>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div
                  className="relative cursor-pointer group"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Avatar src={avatar} name={playerName || "?"} size={72} />
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                <span className="text-xs text-zinc-500">
                  РќР°Р¶РјРёС‚Рµ, С‡С‚РѕР±С‹ РґРѕР±Р°РІРёС‚СЊ С„РѕС‚Рѕ
                </span>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Р’Р°С€ РЅРёРєРЅРµР№Рј</label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="РќР°РїСЂРёРјРµСЂ: РђСЂС‚С‘Рј"
                  className="h-12 rounded-xl bg-zinc-100 text-zinc-950 placeholder:text-zinc-400 border-0 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
                  onKeyDown={(e) => e.key === "Enter" && setupNickname()}
                  autoFocus
                />
              </div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={setupNickname}
                  disabled={!playerName.trim()}
                  className="w-full h-12 rounded-xl text-base bg-red-600 hover:bg-red-500 text-white border-0 disabled:bg-zinc-700 disabled:text-zinc-500"
                >
                  РџСЂРѕРґРѕР»Р¶РёС‚СЊ
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  if (screen === "home") {
    return (
      <motion.div
        key="home"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10"
      >
        <AnimatePresence>
          {kickedAlert && (
            <motion.div
              key="kicked"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="max-w-6xl mx-auto mb-4 bg-red-600/20 border border-red-600/40 text-red-300 rounded-xl px-4 py-3 text-sm"
            >
              {kickedAlert}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-6xl mx-auto mb-6 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/90 p-1.5 shadow-sm shadow-black/30">
            <Button
              variant="ghost"
              onClick={() => setHomeTab("play")}
              className={`h-9 rounded-full px-4 gap-2 ${
                homeTab === "play"
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              РРіСЂР°С‚СЊ
            </Button>
            <Button
              variant="ghost"
              onClick={() => setHomeTab("development")}
              className={`h-9 rounded-full px-4 gap-2 ${
                homeTab === "development"
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
              }`}
            >
              <Wrench className="w-4 h-4" />
              Р Р°Р·СЂР°Р±РѕС‚РєР°
            </Button>
            <Button
              variant="ghost"
              onClick={() => setHomeTab("help")}
              className={`h-9 rounded-full px-4 gap-2 ${
                homeTab === "help"
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
              }`}
            >
              <CircleHelp className="w-4 h-4" />
              РџРѕРјРѕС‰СЊ
            </Button>
          </div>
        </div>

        {homeTab === "play" && (
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-6 items-stretch">
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="initial"
            animate="animate"
          >
            <Card className="rounded-[28px] shadow-sm border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 h-full text-zinc-100">
              <CardContent className="p-8 md:p-10 h-full flex flex-col justify-between gap-8">
                <div className="space-y-5">
                  <Badge className="rounded-full px-3 py-1 text-sm bg-red-600/90 hover:bg-red-600 text-white border-0">
                    Made By Berly
                  </Badge>
                  <div className="space-y-3">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                      РЎРЈР”
                    </h1>
                    <p className="text-base md:text-lg text-zinc-400 max-w-xl">
                      Р РѕР»РµРІР°СЏ РЅР°СЃС‚РѕР»СЊРЅР°СЏ РёРіСЂР° Рѕ СЃСѓРґРµР±РЅС‹С… СЂР°Р·Р±РёСЂР°С‚РµР»СЊСЃС‚РІР°С….
                      РџРѕР»СѓС‡РёС‚Рµ СЂРѕР»СЊ, РёР·СѓС‡РёС‚Рµ С„Р°РєС‚С‹ РґРµР»Р° Рё РїРѕРїСЂРѕР±СѓР№С‚Рµ СѓР±РµРґРёС‚СЊ
                      СЃСѓРґСЊСЋ РІ СЃРІРѕРµР№ РїСЂР°РІРѕС‚Рµ.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { title: "3вЂ“6 РёРіСЂРѕРєРѕРІ", sub: "Р Р°Р·РЅС‹Рµ СЂРѕР»Рё Рё СЂРµР¶РёРјС‹" },
                    { title: "РљР°СЂС‚С‹ РњРµС…Р°РЅРёРє", sub: "Р”Р°СЋС‚ РѕСЃРѕР±С‹Рµ РІРѕР·РјРѕР¶РЅРѕСЃС‚Рё" },
                    { title: "РЈР»РёРєРё", sub: "РћР±СЉРµРєС‚РёРІРЅС‹Рµ Рё РѕР±С‰РёРµ" },
                    { title: "Р¤Р°РєС‚С‹", sub: "Р Р°СЃРєСЂС‹РІР°СЋС‚СЃСЏ РїРѕ С…РѕРґСѓ СЃСѓРґР°" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      custom={i + 1}
                      variants={cardVariants}
                      initial="initial"
                      animate="animate"
                    >
                      <Card className="rounded-2xl bg-zinc-900/90 border-zinc-800 text-zinc-100">
                        <CardContent className="p-4">
                          <div className="font-semibold">{item.title}</div>
                          <div className="text-zinc-400 mt-1">{item.sub}</div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            custom={1}
            variants={cardVariants}
            initial="initial"
            animate="animate"
          >
            <Card className="rounded-[28px] shadow-sm h-full bg-zinc-900/95 border-zinc-800 text-zinc-100">
              <CardContent className="p-8 md:p-10 space-y-6">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      key="err"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="bg-red-600/20 border border-red-600/40 text-red-400 rounded-xl px-4 py-3 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-4">
                  <div
                    className="relative cursor-pointer group flex-shrink-0"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Avatar src={avatar} name={playerName} size={52} />
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Р’Р°С€ РЅРёРєРЅРµР№Рј</label>
                    <Input
                      value={playerName}
                      onChange={(e) => {
                        setPlayerName(e.target.value);
                        if (e.target.value.trim())
                          localStorage.setItem(
                            "court_nickname",
                            e.target.value.trim(),
                          );
                      }}
                      placeholder="РќР°РїСЂРёРјРµСЂ: РђСЂС‚С‘Рј"
                      className="h-11 rounded-xl bg-zinc-100 text-zinc-950 placeholder:text-zinc-400 border-0 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>

                <div className="grid gap-3">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Button
                      onClick={createRoom}
                      className="w-full h-12 rounded-xl text-base gap-2 bg-red-600 hover:bg-red-500 text-white border-0"
                    >
                      <UserPlus className="w-4 h-4" />
                      РЎРѕР·РґР°С‚СЊ РєРѕРјРЅР°С‚Сѓ
                    </Button>
                  </motion.div>

                  <div className="flex gap-3">
                    <Input
                      value={joinCode}
                      onChange={(e) =>
                        setJoinCode(e.target.value.toUpperCase())
                      }
                      placeholder="РљРѕРґ РєРѕРјРЅР°С‚С‹"
                      className="h-12 rounded-xl bg-zinc-100 text-zinc-950 placeholder:text-zinc-400 border-0 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
                      onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                    />
                    <motion.div
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Button
                        onClick={joinRoom}
                        variant="secondary"
                        disabled={!joinCode.trim()}
                        className="h-12 rounded-xl px-6 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 border-0"
                      >
                        Р’РѕР№С‚Рё
                      </Button>
                    </motion.div>
                  </div>

                  <AnimatePresence>
                    {hasSession && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28 }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <Button
                            onClick={reconnect}
                            variant="outline"
                            className="w-full h-12 rounded-xl border-red-600/50 text-red-400 hover:bg-red-600/10 hover:text-red-300 gap-2"
                          >
                            в†© РџРµСЂРµРїРѕРґРєР»СЋС‡РёС‚СЊСЃСЏ Рє РёРіСЂРµ
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="font-semibold">Р¤СѓРЅРєС†РёРѕРЅР°Р»</div>
                  <div className="grid gap-2 text-sm text-zinc-400">
                    <div>вЂў СЃРѕР·РґР°Р№С‚Рµ РєРѕРјРЅР°С‚Сѓ Рё РїРѕРґРµР»РёС‚РµСЃСЊ РєРѕРґРѕРј СЃ РёРіСЂРѕРєР°РјРё</div>
                    <div>
                      вЂў РІРµРґСѓС‰РёР№ Р·Р°РїСѓСЃРєР°РµС‚ РёРіСЂСѓ Рё СЂРѕР»Рё СЂР°Р·РґР°СЋС‚СЃСЏ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё
                    </div>
                    <div>вЂў РєР°Р¶РґС‹Р№ РІРёРґРёС‚ С‚РѕР»СЊРєРѕ СЃРІРѕРё С„Р°РєС‚С‹ Рё РєР°СЂС‚С‹ РјРµС…Р°РЅРёРє</div>
                    <div>
                      вЂў СЂР°СЃРєСЂС‹С‚С‹Рµ С„Р°РєС‚С‹ Рё РёСЃРїРѕР»СЊР·РѕРІР°РЅРЅС‹Рµ РєР°СЂС‚С‹ РІРёРґСЏС‚ РІСЃРµ
                    </div>
                    <div>вЂў СЃСѓРґСЊСЏ РјРµРЅСЏРµС‚ СЌС‚Р°РїС‹ Рё РІС‹РЅРѕСЃРёС‚ С„РёРЅР°Р»СЊРЅС‹Р№ РІРµСЂРґРёРєС‚</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        )}

        {homeTab === "development" && (
          <div className="max-w-6xl mx-auto">
            <Card className="rounded-[28px] border-zinc-800 bg-zinc-900/95 text-zinc-100">
              <CardContent className="p-8 md:p-10 space-y-6">
                <div className="flex justify-center">
                  <div className="w-full max-w-md rounded-3xl border border-red-500/35 bg-gradient-to-br from-red-950/50 via-zinc-900 to-zinc-900 px-6 py-5 text-center shadow-[0_16px_40px_rgba(185,28,28,0.25)]">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-red-300/80">
                      Build
                    </div>
                    <div className="mt-2 text-3xl md:text-4xl font-semibold text-red-100">
                      {CURRENT_VERSION}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {DEVLOG_ENTRIES.map((entry, index) => (
                    <motion.div
                      key={`${entry.date}-${entry.title}`}
                      custom={index}
                      variants={cardVariants}
                      initial="initial"
                      animate="animate"
                    >
                      <Card className="rounded-2xl border-zinc-800 bg-zinc-900 text-zinc-100">
                        <CardContent className="p-5 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-semibold">{entry.title}</div>
                            <Badge className="bg-zinc-800 text-zinc-100 border border-zinc-700">
                              {entry.date}
                            </Badge>
                          </div>
                          <div className="text-sm text-zinc-400">
                            Р’РµСЂСЃРёСЏ: {entry.version}
                          </div>
                          <div className="space-y-2 text-sm text-zinc-300">
                            {entry.changes.map((change) => (
                              <div key={change}>вЂў {change}</div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {homeTab === "help" && (
          <div className="max-w-6xl mx-auto">
            <Card className="rounded-[28px] border-zinc-800 bg-zinc-900/95 text-zinc-100">
              <CardContent className="p-8 md:p-10">
                <HelpCenter
                  query={mainHelpQuery}
                  onQueryChange={setMainHelpQuery}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    );
  }

  if (screen === "room" && room) {
    return (
      <motion.div
        key="room"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10"
      >
        <div className="max-w-6xl mx-auto space-y-6">
          <AnimatePresence>
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-600/20 border border-red-600/40 text-red-400 rounded-xl px-4 py-3 text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            custom={0}
            variants={cardVariants}
            initial="initial"
            animate="animate"
          >
            <Card className="rounded-[28px] shadow-sm bg-zinc-900/95 border-zinc-800 text-zinc-100">
              <CardContent className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Scale className="w-4 h-4" />
                    РљРѕРґ РєРѕРјРЅР°С‚С‹
                  </div>
                  <div className="text-3xl font-bold tracking-[0.25em] text-red-400">
                    {room.code}
                  </div>
                  <div className="text-sm text-zinc-400">
                    РџРѕРґРµР»РёС‚РµСЃСЊ РєРѕРґРѕРј СЃ РґСЂСѓРіРёРјРё РёРіСЂРѕРєР°РјРё вЂў 3вЂ“6 СѓС‡Р°СЃС‚РЅРёРєРѕРІ
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    className="rounded-xl gap-2 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 border-0"
                    onClick={() => copyCode(room.code)}
                  >
                    <Copy className="w-4 h-4" />
                    {copiedRoomCode ? "РЎРєРѕРїРёСЂРѕРІР°РЅРѕ" : "РЎРєРѕРїРёСЂРѕРІР°С‚СЊ"}
                  </Button>
                  {myId === room.hostId && (
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Button
                        className="rounded-xl gap-2 bg-red-600 hover:bg-red-500 text-white border-0 disabled:bg-zinc-800 disabled:text-zinc-500"
                        onClick={startGame}
                        disabled={
                          startGameLoading ||
                          room.players.length < 3 ||
                          room.players.length > 6
                        }
                      >
                        <Play className="w-4 h-4" />
                        {startGameLoading ? "\u0417\u0430\u043f\u0443\u0441\u043a..." : "\u041d\u0430\u0447\u0430\u0442\u044c \u0438\u0433\u0440\u0443"}
                      </Button>
                    </motion.div>
                  )}
                  <Button
                    variant="outline"
                    className="rounded-xl border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100"
                    onClick={resetAll}
                  >
                    Р’С‹Р№С‚Рё
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <motion.div
              custom={1}
              variants={cardVariants}
              initial="initial"
              animate="animate"
            >
              <InfoBlock
                title="РРіСЂРѕРєРё РІ РєРѕРјРЅР°С‚Рµ"
                icon={<UserPlus className="w-5 h-5" />}
                action={myId === room.hostId ? (
                  <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800/60">
                    <label htmlFor="host-judge" className="text-sm font-medium text-zinc-200 cursor-pointer select-none">
                      РЇ - РЎСѓРґСЊСЏ
                    </label>
                    <Switch
                      id="host-judge"
                      checked={isHostJudge}
                      onCheckedChange={toggleHostJudge}
                    />
                  </div>
                ) : undefined}
              >
                <div className="grid gap-3">
                  <AnimatePresence>
                    {room.players.map((player) => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        isHost={player.id === room.hostId}
                        canKick={myId === room.hostId && player.id !== room.hostId}
                        onKick={() => kickPlayerFromRoom(player.id)}
                      />
                    ))}
                  </AnimatePresence>
                  {room.players.length < 3 && (
                    <div className="text-sm text-zinc-500 mt-2">
                      РћР¶РёРґР°РЅРёРµ РёРіСЂРѕРєРѕРІ... (РЅСѓР¶РЅРѕ РµС‰С‘ РјРёРЅРёРјСѓРј{" "}
                      {3 - room.players.length})
                    </div>
                  )}
                </div>
              </InfoBlock>
            </motion.div>

            <motion.div
              custom={2}
              variants={cardVariants}
              initial="initial"
              animate="animate"
            >
              <InfoBlock
                title="Р”РѕСЃС‚СѓРїРЅС‹Рµ СЂРµР¶РёРјС‹"
                icon={<Gavel className="w-5 h-5" />}
              >
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>РРіСЂРѕРєРѕРІ СЃРµР№С‡Р°СЃ</span>
                    <Badge className="bg-zinc-800 text-zinc-100 border border-zinc-700">
                      {room.players.length}
                    </Badge>
                  </div>
                  <Separator />
                  {room.players.length === 3 && (
                    <div>Р“СЂР°Р¶РґР°РЅСЃРєРёР№ СЃРїРѕСЂ, С‚СЂСѓРґРѕРІРѕР№ СЃРїРѕСЂ</div>
                  )}
                  {room.players.length === 4 && <div>РЈРіРѕР»РѕРІРЅРѕРµ РґРµР»Рѕ</div>}
                  {room.players.length === 5 && <div>РЈРіРѕР»РѕРІРЅРѕРµ РґРµР»Рѕ</div>}
                  {room.players.length >= 6 && <div>РЎСѓРґ РЅР° РєРѕРјРїР°РЅРёСЋ</div>}
                  <div className="text-zinc-400 pt-2">
                    Р’РµРґСѓС‰РёР№ Р·Р°РїСѓСЃРєР°РµС‚ РёРіСЂСѓ, СЃР°Р№С‚ СЃР»СѓС‡Р°Р№РЅРѕ РІС‹Р±РёСЂР°РµС‚ РїРѕРґС…РѕРґСЏС‰РµРµ
                    РґРµР»Рѕ Рё СЂР°СЃРїСЂРµРґРµР»СЏРµС‚ СЂРѕР»Рё.
                  </div>
                </div>
              </InfoBlock>
            </motion.div>
          </div>
          <ContextHelp
            open={contextHelpOpen}
            onOpenChange={setContextHelpOpen}
            query={contextHelpQuery}
            onQueryChange={setContextHelpQuery}
          />
        </div>
      </motion.div>
    );
  }

  if (screen === "game" && game && game.me) {
    const currentStage = stages[game.stageIndex];
    const stageProgress = ((game.stageIndex + 1) / stages.length) * 100;
    const isHost = myId === game.hostId;
    const isJudge = game.me.roleKey === "judge";
    const isWitness = game.me.roleKey === "witness";
    const isObserverRole = isJudge || isWitness;
    const judgePlayer = game.players.find((p) => p.roleKey === "judge");
    const visibleFacts = game.revealedFacts.slice(-3);
    const visibleCards = game.usedCards.slice(-3);
    const latestRevealedFactId =
      game.revealedFacts.length > 0
        ? game.revealedFacts[game.revealedFacts.length - 1].id
        : null;
    const latestUsedCardId =
      game.usedCards.length > 0
        ? game.usedCards[game.usedCards.length - 1].id
        : null;
    const isPreparationStage = game.stageIndex === 0;
    const isOpeningSpeechStage = game.stageIndex === 1;
    const openingSpeechRevealedFacts = game.revealedFacts.filter(
      (fact) => fact.stageIndex === 1,
    ).length;
    const isOpeningSpeechFactLimitReached =
      isOpeningSpeechStage && openingSpeechRevealedFacts >= 2;

    return (
      <motion.div
        key="game"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10"
      >
        <AnimatePresence>
          {showFactHistory && (
            <motion.div
              key="fact-history-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center p-6"
              onClick={(e) =>
                e.target === e.currentTarget && setShowFactHistory(false)
              }
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 16 }}
                transition={{ type: "spring", stiffness: 240, damping: 24 }}
                className="w-full max-w-lg max-h-[80vh] flex flex-col"
              >
                <Card className="rounded-[28px] border-zinc-800 bg-zinc-900 text-zinc-100 flex flex-col overflow-hidden">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <CardTitle className="flex items-center justify-between text-lg text-zinc-100">
                      <span className="flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        РСЃС‚РѕСЂРёСЏ С„Р°РєС‚РѕРІ
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg h-8 w-8 p-0"
                        onClick={() => setShowFactHistory(false)}
                      >
                        вњ•
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-y-auto flex-1 space-y-3 pb-6">
                    {game.revealedFacts.length === 0 ? (
                      <div className="text-sm text-zinc-400">
                        РџРѕРєР° РЅРёРєС‚Рѕ РЅРµ СЂР°СЃРєСЂС‹Р» РЅРё РѕРґРЅРѕРіРѕ С„Р°РєС‚Р°.
                      </div>
                    ) : (
                      game.revealedFacts.map((fact, i) => {
                        const ownerPlayer = game.players.find(
                          (p) => p.id === fact.ownerId,
                        );
                        return (
                          <motion.div
                            key={fact.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                          >
                            <Card className="rounded-2xl border-dashed border-zinc-700 bg-zinc-800/60 text-zinc-100">
                              <CardContent className="p-4 min-h-[120px]">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Avatar
                                      src={ownerPlayer?.avatar ?? null}
                                      name={fact.owner}
                                      size={34}
                                    />
                                    <div className="font-semibold text-base leading-none truncate">
                                      {fact.owner}
                                    </div>
                                  </div>
                                  <Badge className="bg-zinc-700 text-zinc-100 border border-zinc-600">
                                    {fact.ownerRole}
                                  </Badge>
                                </div>
                                <div className="min-h-[64px]">
                                  <div className="text-base text-zinc-300 leading-relaxed">
                                    {fact.text}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}

          {game.finished && (
            <motion.div
              key="verdict-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 32 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  delay: 0.1,
                  type: "spring",
                  stiffness: 220,
                  damping: 22,
                }}
                className="w-full max-w-lg"
              >
                <Card className="rounded-[28px] border-zinc-800 bg-zinc-900 text-zinc-100">
                  <CardContent className="p-8 space-y-6 text-center">
                    <div className="space-y-2">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                      >
                        <Badge className="rounded-full px-3 py-1 text-sm bg-red-600/90 text-white border-0">
                          РРіСЂР° Р·Р°РІРµСЂС€РµРЅР°
                        </Badge>
                      </motion.div>
                      <h1 className="text-3xl font-bold pt-2">Р’РµСЂРґРёРєС‚ СЃСѓРґР°</h1>
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="bg-zinc-800/60 rounded-2xl p-6 space-y-1"
                    >
                      <div className="text-sm text-zinc-400">Р РµС€РµРЅРёРµ СЃСѓРґСЊРё</div>
                      <div className="text-2xl font-bold text-red-400">
                        {game.verdict}
                      </div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-left space-y-3"
                    >
                      <div className="bg-zinc-800/40 rounded-2xl p-4">
                        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                          Р РµР°Р»СЊРЅР°СЏ РїСЂР°РІРґР° РґРµР»Р°
                        </div>
                        <div className="text-sm text-zinc-300">
                          {game.caseData.truth}
                        </div>
                      </div>
                      {game.verdictEvaluation && (
                        <div className="bg-red-600/10 border border-red-600/30 rounded-2xl p-4">
                          <div className="text-sm font-medium text-red-400">
                            {game.verdictEvaluation}
                          </div>
                        </div>
                      )}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.55 }}
                    >
                      <Button
                        onClick={finalExit}
                        className="w-full h-12 rounded-xl text-base bg-zinc-100 text-zinc-950 hover:bg-zinc-200 border-0"
                      >
                        Р’С‹Р№С‚Рё РІ РіР»Р°РІРЅРѕРµ РјРµРЅСЋ
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto space-y-6">
          <AnimatePresence>
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-600/20 border border-red-600/40 text-red-400 rounded-xl px-4 py-3 text-sm"
              >
                {error}
              </motion.div>
            )}
            {disconnectAlert && (
              <motion.div
                key="disc"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 rounded-xl px-4 py-3 text-sm font-medium"
              >
                {disconnectAlert}
              </motion.div>
            )}
            {rejoinAlert && (
              <motion.div
                key="rej"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-green-500/15 border border-green-500/40 text-green-300 rounded-xl px-4 py-3 text-sm font-medium"
              >
                вњ“ {rejoinAlert}
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="rounded-[28px] shadow-sm border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
            <CardContent className="p-8 space-y-6">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Badge className="bg-zinc-800 text-zinc-100 border border-zinc-700">
                      {game.caseData.mode}
                    </Badge>
                    <span>{game.caseData.title}</span>
                    <span className="text-zinc-600">вЂў РљРѕРјРЅР°С‚Р° {game.code}</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold">
                    {game.caseData.description}
                  </h1>
                </div>

                <div className="min-w-[260px] space-y-3">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStage}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.25 }}
                      className="text-sm font-medium"
                    >
                      Р­С‚Р°Рї: {currentStage}
                    </motion.div>
                  </AnimatePresence>
                  <Progress
                    value={stageProgress}
                    className="h-3 bg-zinc-800 [&>div]:bg-red-600 [&>div]:transition-all [&>div]:duration-500"
                  />
                  <div className="flex flex-wrap gap-3">
                    {(isHost || isJudge) && (
                      <>
                        <Button
                          variant="outline"
                          className="rounded-xl border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40"
                          onClick={retreatStage}
                          disabled={game.stageIndex <= 0 || game.finished}
                        >
                          в†ђ РџСЂРµРґ.
                        </Button>
                        <Button
                          variant="secondary"
                          className="rounded-xl bg-zinc-100 text-zinc-950 hover:bg-zinc-200 border-0 disabled:bg-zinc-800 disabled:text-zinc-500"
                          onClick={advanceStage}
                          disabled={
                            game.stageIndex >= stages.length - 1 ||
                            game.finished
                          }
                        >
                          РЎР»РµРґ. в†’
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      className="rounded-xl border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100"
                      onClick={resetAll}
                    >
                      Р’С‹Р№С‚Рё
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid xl:grid-cols-[1.1fr_1.1fr_0.9fr] gap-6">
            <InfoBlock title="Р’Р°С€Р° СЂРѕР»СЊ" icon={<Shield className="w-5 h-5" />}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar src={game.me.avatar ?? avatar} name={game.me.name} size={56} />
                  <div>
                    <div className="text-2xl font-bold">
                      {game.me.roleTitle}
                    </div>
                    <div className="text-sm text-zinc-400">{game.me.name}</div>
                  </div>
                </div>
                <div>
                  <div className="font-semibold mb-1">Р¦РµР»СЊ</div>
                  <p className="text-sm text-zinc-400">{game.me.goal}</p>
                </div>
                <Separator />
                <div>
                  <div className="font-semibold mb-2 text-sm">
                    Р’СЃРµ СѓС‡Р°СЃС‚РЅРёРєРё
                  </div>
                  <div className="space-y-1">
                    {game.players.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar src={p.avatar ?? null} name={p.name} size={32} />
                          <span className="text-zinc-300 truncate">{p.name}</span>
                        </div>
                        <span className="text-zinc-500">{p.roleTitle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </InfoBlock>

            <InfoBlock title="РЈР»РёРєРё РґРµР»Р°" icon={<Eye className="w-5 h-5" />}>
              <div className="space-y-3">
                {game.caseData.evidence.map((item, index) => (
                  <motion.div
                    key={index}
                    custom={index}
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                  >
                    <Card className="rounded-2xl border-dashed border-zinc-700 bg-zinc-900/80 text-zinc-100">
                      <CardContent className="p-4 text-sm">{item}</CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </InfoBlock>

            <InfoBlock title="Р’РµСЂРґРёРєС‚" icon={<Gavel className="w-5 h-5" />}>
              <div className="space-y-3">
                {isJudge ? (
                  <>
                    <div
                      className={`text-sm ${game.stageIndex < stages.length - 1 ? "text-zinc-500" : "text-zinc-400"}`}
                    >
                      {game.stageIndex < stages.length - 1
                        ? `Р”РѕСЃС‚СѓРїРЅРѕ РЅР° СЌС‚Р°РїРµ В«${stages[stages.length - 1]}В»`
                        : "Р¤РёРЅР°Р»СЊРЅС‹Р№ СЌС‚Р°Рї. Р’С‹РЅРµСЃРёС‚Рµ СЂРµС€РµРЅРёРµ."}
                    </div>
                    {(
                      ["Р’РёРЅРѕРІРµРЅ", "РќРµ РІРёРЅРѕРІРµРЅ", "Р§Р°СЃС‚РёС‡РЅРѕ РІРёРЅРѕРІРµРЅ"] as const
                    ).map((v, i) => (
                      <motion.div
                        key={v}
                        custom={i}
                        variants={cardVariants}
                        initial="initial"
                        animate="animate"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Button
                          className={`w-full rounded-xl border-0 disabled:bg-zinc-800 disabled:text-zinc-500 ${i === 0 ? "bg-red-600 hover:bg-red-500 text-white" : i === 1 ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200" : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"}`}
                          onClick={() => submitVerdict(v)}
                          disabled={
                            game.stageIndex < stages.length - 1 || game.finished
                          }
                        >
                          {v}
                        </Button>
                      </motion.div>
                    ))}
                  </>
                ) : (
                  <div className="text-sm text-zinc-400">
                    Р’РµСЂРґРёРєС‚ РІС‹РЅРѕСЃРёС‚ СЃСѓРґСЊСЏ
                    {judgePlayer ? ` вЂ” ${judgePlayer.name}` : ""}.
                    {game.stageIndex < stages.length - 1 && (
                      <span className="block mt-1 text-zinc-500">
                        Р”РѕР¶РґРёС‚РµСЃСЊ РїРѕСЃР»РµРґРЅРµРіРѕ СЌС‚Р°РїР°.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </InfoBlock>
          </div>

          <div
            className={`grid gap-6 ${isObserverRole ? "xl:grid-cols-2" : "xl:grid-cols-[1fr_1fr_1fr_1fr]"}`}
          >
            <InfoBlock
              title="Р Р°СЃРєСЂС‹С‚С‹Рµ С„Р°РєС‚С‹"
              icon={<Eye className="w-5 h-5" />}
              action={
                game.revealedFacts.length > 0 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg h-7 px-2"
                    onClick={() => setShowFactHistory(true)}
                  >
                    РСЃС‚РѕСЂРёСЏ ({game.revealedFacts.length})
                  </Button>
                ) : undefined
              }
            >
              <div className="space-y-3 min-h-[80px]">
                {visibleFacts.length === 0 ? (
                  <div className="text-sm text-zinc-400">
                    РџРѕРєР° РЅРёРєС‚Рѕ РЅРµ СЂР°СЃРєСЂС‹Р» РЅРё РѕРґРЅРѕРіРѕ С„Р°РєС‚Р°.
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {visibleFacts.map((fact) => {
                      const isLatestFact = fact.id === latestRevealedFactId;
                      const ownerPlayer = game.players.find(
                        (p) => p.id === fact.ownerId,
                      );
                      return (
                      <motion.div
                        key={fact.id}
                        variants={entryVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        layout
                      >
                        <Card
                          className={
                            isLatestFact
                              ? "rounded-2xl border border-red-500/35 bg-red-950/15 text-zinc-100 ring-1 ring-red-500/20 shadow-[0_0_10px_rgba(220,38,38,0.12)]"
                              : "rounded-2xl border-dashed border-zinc-700 bg-zinc-900/80 text-zinc-100"
                          }
                        >
                          <CardContent className="p-4 min-h-[120px]">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar
                                  src={ownerPlayer?.avatar ?? null}
                                  name={fact.owner}
                                  size={34}
                                />
                                <div className="font-semibold text-base leading-none truncate">
                                  {fact.owner}
                                </div>
                              </div>
                              <Badge
                                className={
                                  isLatestFact
                                    ? "bg-red-600/20 text-red-100 border border-red-500/30"
                                    : "bg-zinc-800 text-zinc-100 border border-zinc-700"
                                }
                              >
                                {fact.ownerRole}
                              </Badge>
                            </div>
                            <div className="min-h-[64px]">
                              <div className="text-base text-zinc-300 leading-relaxed">
                                {fact.text}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </InfoBlock>

            {!isObserverRole && (
              <InfoBlock
                title="Р’Р°С€Рё С„Р°РєС‚С‹"
                icon={<AlertCircle className="w-5 h-5" />}
              >
                <div className="space-y-3">
                  {game.me.facts.length === 0 ? (
                    <div className="text-sm text-zinc-400">
                      РЈ РІР°СЃ РЅРµС‚ С„Р°РєС‚РѕРІ РґР»СЏ СЂР°СЃРєСЂС‹С‚РёСЏ.
                    </div>
                  ) : (
                    game.me.facts.map((fact) => (
                      <Card
                        key={fact.id}
                        className="rounded-2xl bg-zinc-900/80 border-zinc-800 text-zinc-100"
                      >
                        <CardContent className="p-4 flex flex-col gap-3">
                          <div className="text-sm">{fact.text}</div>
                          <div className="flex items-center justify-between gap-3">
                            <Badge
                              className={
                                fact.revealed
                                  ? "bg-red-600 text-white border-0"
                                  : "bg-zinc-800 text-zinc-100 border border-zinc-700"
                              }
                            >
                              {fact.revealed ? "Р Р°СЃРєСЂС‹С‚" : "РЎРєСЂС‹С‚"}
                            </Badge>
                            <motion.div
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                            >
                              <Button
                                size="sm"
                                className="rounded-xl bg-red-600 hover:bg-red-500 text-white border-0 disabled:bg-zinc-800 disabled:text-zinc-500"
                                onClick={() => revealFact(fact.id)}
                                disabled={
                                  fact.revealed ||
                                  game.finished ||
                                  isPreparationStage ||
                                  isOpeningSpeechFactLimitReached
                                }
                              >
                                Р Р°СЃРєСЂС‹С‚СЊ
                              </Button>
                            </motion.div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </InfoBlock>
            )}

            {!isObserverRole && (
              <InfoBlock
                title="Р’Р°С€Рё РєР°СЂС‚С‹ РјРµС…Р°РЅРёРє"
                icon={<Scale className="w-5 h-5" />}
              >
                <div className="space-y-3">
                  {game.me.cards.map((card) => (
                    <Card
                      key={card.id}
                      className="rounded-2xl bg-zinc-900/80 border-zinc-800 text-zinc-100"
                    >
                      <CardContent className="p-4 flex flex-col gap-3">
                        <div>
                          <div className="font-semibold">{card.name}</div>
                          <div className="text-sm text-zinc-400 mt-1">
                            {card.description}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <Badge
                            className={
                              card.used
                                ? "border border-zinc-700 bg-zinc-900 text-zinc-300"
                                : "bg-red-600 text-white border-0"
                            }
                          >
                            {card.used ? "РСЃРїРѕР»СЊР·РѕРІР°РЅР°" : "Р“РѕС‚РѕРІР°"}
                          </Badge>
                          <motion.div
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                          >
                            <Button
                              size="sm"
                              variant="secondary"
                              className="rounded-xl bg-zinc-100 text-zinc-950 hover:bg-zinc-200 border-0 disabled:bg-zinc-800 disabled:text-zinc-500"
                              onClick={() => useCard(card.id)}
                              disabled={card.used || game.finished || isPreparationStage}
                            >
                              РџСЂРёРјРµРЅРёС‚СЊ
                            </Button>
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </InfoBlock>
            )}

            <InfoBlock
              title="Р–СѓСЂРЅР°Р» РјРµС…Р°РЅРёРє"
              icon={<Sparkles className="w-5 h-5" />}
            >
              <div className="space-y-3 min-h-[80px]">
                {visibleCards.length === 0 ? (
                  <div className="text-sm text-zinc-400">
                    РџРѕРєР° РЅРё РѕРґРЅР° РєР°СЂС‚Р° РЅРµ Р±С‹Р»Р° РёСЃРїРѕР»СЊР·РѕРІР°РЅР°.
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {visibleCards.map((entry) => {
                      const isLatestCard = entry.id === latestUsedCardId;
                      const ownerPlayer = game.players.find(
                        (p) => p.id === entry.ownerId,
                      );
                      return (
                      <motion.div
                        key={entry.id}
                        variants={entryVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        layout
                      >
                        <Card
                          className={
                            isLatestCard
                              ? "rounded-2xl border border-red-500/35 bg-red-950/15 text-zinc-100 ring-1 ring-red-500/20 shadow-[0_0_10px_rgba(220,38,38,0.12)]"
                              : "rounded-2xl border-dashed border-zinc-700 bg-zinc-900/80 text-zinc-100"
                          }
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar
                                  src={ownerPlayer?.avatar ?? null}
                                  name={entry.owner}
                                  size={30}
                                />
                                <div className="font-semibold text-sm truncate">
                                  {entry.owner}
                                </div>
                              </div>
                              <Badge
                                className={
                                  isLatestCard
                                    ? "bg-red-600/20 text-red-100 border border-red-500/30"
                                    : "bg-zinc-800 text-zinc-100 border border-zinc-700"
                                }
                              >
                                {entry.ownerRole}
                              </Badge>
                            </div>
                            <div className="font-semibold">{entry.name}</div>
                            <div className="text-sm text-zinc-400 mt-1">
                              {entry.description}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </InfoBlock>
          </div>
          <ContextHelp
            open={contextHelpOpen}
            onOpenChange={setContextHelpOpen}
            query={contextHelpQuery}
            onQueryChange={setContextHelpQuery}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.8 }}
        className="text-zinc-400 text-sm"
      >
        Р—Р°РіСЂСѓР·РєР°...
      </motion.div>
    </div>
  );
}




