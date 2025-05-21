import { ISentence } from "@/Core/controller/scene/sceneInterface";

/**
 * @interface IAiSentenceState AI单句接口
 */
export interface IAiSentenceState {
  id: string; // 唯一ID
  name: string; // 名称
  prompt: string; // 提示语
  response: string; // 返回内容
  isLoading: boolean; // 是否等待AI输出
  isError: boolean; // 是否错误
  forDialogue: boolean; // 是否控制对话
  forFigure: boolean; // 是否控制立绘
  forBackground: boolean; // 是否控制背景
  forMusic: boolean; // 是否控制音乐
  forScene: boolean; // 是否控制场景切换
  model: string; // 模型名称
  showAfterPoint: boolean; //点击后才显示ai回复
}

/**
 * @interface IAIstate 游戏AI数据接口
 */

export interface IAiState {
  OnGoings: Array<IAiSentenceState>; // 正在进行的AI对话
  sentenceGenerated: Array<IAiGeneratedSentence>; // 生成的句子
  uuid: string; // 唯一ID
}

/**
 * @interface ISetAiStatePayload 设置AI状态的Payload接口
 */
export interface ISetAiStatePayload {
  key: keyof IAiState; // 键名
  value: any; // 键值
}

export interface IFinishAiSentencePayload {
  id: string; // 对话ID
  response: string; // 返回内容
}

export interface IAiGeneratedSentence {
  index: number; // 句子索引
  sentence: ISentence; // 句子内容
}

export type AiState = IAiState;