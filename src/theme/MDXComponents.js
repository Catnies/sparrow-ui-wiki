// src/theme/MDXComponents.js
// 全局注册文档组件，让 mdx 里直接写 <MinecraftSlotGrid />，不用每页顶上重复 import。
//
// 全站 41 页、每页都要用到 NextStep，再加上 MinecraftSlotGrid、ApiTable、ThreadBadge
// 这些高频组件，逐页 import 既啰嗦又容易漏。注册在这里之后，所有 mdx
// （包括 src/pages 下的页面）都能直接使用。

import MDXComponents from '@theme-original/MDXComponents';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

import ApiTable from '@site/src/components/ApiTable';
import BuildTabs from '@site/src/components/BuildTabs';
import CodeSteps from '@site/src/components/CodeSteps';
import ConceptMap from '@site/src/components/ConceptMap';
import Exercise, {ExerciseApproach, ExerciseAnswer} from '@site/src/components/Exercise';
import MinecraftSlotGrid from '@site/src/components/MinecraftSlotGrid';
import MinecraftWindow from '@site/src/components/MinecraftWindow';
import MinecraftWindowDemo from '@site/src/components/MinecraftWindowDemo';
import MinecraftLoadingDemo from '@site/src/components/MinecraftLoadingDemo';
import NextStep from '@site/src/components/NextStep';
import SharedPaneDemo from '@site/src/components/SharedPaneDemo';
import SessionStructureDemo from '@site/src/components/SessionStructureDemo';
import SignalHint from '@site/src/components/SignalHint';
import ThreadBadge from '@site/src/components/ThreadBadge';
import VersionBadge from '@site/src/components/VersionBadge';
import Details from '@site/src/components/Details';
import EmbedCard from '@site/src/components/EmbedCard';
import Highlight from '@site/src/components/Highlight';
import UrlCard from '@site/src/components/UrlCard';

export default {
  ...MDXComponents,

  // Docusaurus 自带
  Tabs,
  TabItem,

  // Sparrow UI Wiki 通用组件
  ApiTable,
  BuildTabs,
  CodeSteps,
  ConceptMap,
  Exercise,
  ExerciseApproach,
  ExerciseAnswer,
  MinecraftSlotGrid,
  MinecraftWindow,
  MinecraftWindowDemo,
  MinecraftLoadingDemo,
  NextStep,
  SharedPaneDemo,
  SessionStructureDemo,
  SignalHint,
  ThreadBadge,
  VersionBadge,

  // 复用组件
  Details,
  EmbedCard,
  Highlight,
  UrlCard,
};
