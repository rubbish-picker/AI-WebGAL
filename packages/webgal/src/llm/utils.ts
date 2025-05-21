import { aiConfig, AIConfig } from "./AIConfig";
import { IAiState } from "./AIInterface";
import { AIMessage } from "./AIMessage";
import { AILoreItem } from "./loreInterface";

/**
 * 长文本分页处理函数
 * @param text 原始文本内容
 * @param maxLength 单页最大长度（字符数）
 * @param splitChars 分割字符列表（默认包含中英文标点）
 * @returns 分割后的文本数组
 * 
 * 算法：
 * 1. 优先在标点符号处分割
 * 2. 无标点时强制按最大长度分割
 * 3. 保留分割符到前一句
 */
export function splitOverflowText(
    text: string,
    maxLength: number,
): string[] {
    const sentences: string[] = [];
    const splitChars: string[] = aiConfig.sentenceSpliter;
    const closePunctuation = new Set(aiConfig.closePunctuation);
    let start = 0;

    while (start < text.length) {
        let end = Math.min(start + maxLength, text.length);
        let lastSplitPos = -1;

        // 在[start, end)范围内查找最后一个有效分割点
        for (let i = start; i < end; i++) {
            if (splitChars.includes(text[i])) {
                let splitEnd = i;
                // 检查闭合标点
                if (i + 1 < text.length && closePunctuation.has(text[i + 1])) {
                    splitEnd = i + 1;
                    if (splitEnd >= end) break; // 闭合标点超出当前范围则不处理
                    i++; // 跳过已处理的闭合标点
                }
                lastSplitPos = splitEnd; // 记录最后有效分割位置（包含闭合标点）
            }
        }

        let splitPos = -1;
        if (lastSplitPos !== -1) {
            // 分割点需要包含闭合标点
            splitPos = lastSplitPos + 1; // substring结束索引为exclusive
        } else {
            // 没有找到分割点则强制分割
            splitPos = end;
        }

        const sentence = text.substring(start, splitPos);
        if (sentence.trim() !== "") {
            sentences.push(sentence);
        }
        start = splitPos;
    }

    return sentences;
}

/**
 * 生成符合UUID v4规范的唯一标识
 * @returns 格式为xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx的字符串
 * 
 * 版本规范：
 * - 第13位固定为4（版本标识）
 * - 第17位高位固定为0b10（变体标识）
 */
export const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0; // 0-15的随机数
        const v = c === 'x' ? r : (r & 0x3 | 0x8); // 版本4规则处理
        return v.toString(16);
    });
}

/**
 * 知识库条目转换器
 * @param lore 知识库条目对象
 * @returns 标准化AI消息对象
 * 
 * 用于将知识库格式转换为通用消息格式
 */
export const convertLoreToAIMessage = (lore: AILoreItem): AIMessage => {
    return {
        role: lore.role,
        content: lore.content,
    };
}

/**
 * 反向索引插入函数
 * @param originMessage 原始数组
 * @param messageToInsert 待插入元素
 * @param insertIndexFromBack 从末尾计算的插入位置（0表示最后一位前）
 * 
 * 示例：
 * - 数组长度=5，insertIndexFromBack=2 → 插入位置=3（0-based）
 * - 即插入到倒数第2个位置前（原数组索引3的位置）
 */
export const insertFromBack = (
    originMessage: any[],
    messageToInsert: any,
    insertIndexFromBack: number
): void => {
    const insertIndex = originMessage.length - insertIndexFromBack;
    if (insertIndex < 0 || insertIndex > originMessage.length) {
        throw new Error("插入位置超出有效范围");
    }
    originMessage.splice(insertIndex, 0, messageToInsert);
}

export const isEmptyString = (str: string): boolean => {
    return str === null || str === undefined || str.trim() === "";
}

/**
 * 通用键值对接口
 * 用于配置项的标准化存储和检索
 */
export interface GeneralKeyValueInterface {
    key: string;   // 配置项标识
    value: string; // 配置值（通常为资源路径或标识）
}

export const getNewAiInitState = (): IAiState => {
    return{
        OnGoings: [],
        sentenceGenerated: [],
        uuid: generateUUID(),
    }
}