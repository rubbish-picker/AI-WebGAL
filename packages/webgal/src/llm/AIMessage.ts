import { commandType, IAsset, ISentence } from "@/Core/controller/scene/sceneInterface";
import { AILive2DFeature } from "./AICharacter";
import { AiActions } from "./AIReducer";
import { webgalStore } from "@/store/store";
import { assetSetter, fileType } from "@/Core/util/gameAssetsAccess/assetSetter";
import { IBacklogItem } from "@/Core/Modules/backlog";
import { parsedCardManager } from "./cardParser";
import { WebGAL } from "@/Core/WebGAL";
import { AILoreItem } from "./loreInterface";
import { convertLoreToAIMessage, generateUUID, insertFromBack, isEmptyString } from "./utils";
import { aiConfig } from "./AIConfig";
import { logger } from "@/Core/util/logger";

/**
 * 扩展知识库条目接口，增加处理状态跟踪
 */
interface AILoreItemExpanded extends AILoreItem {
    processed: boolean; // 标记该条目是否已被处理
}

export const zeroPoint: Point2D = { x: 0, y: 0 }; // 零点坐标

export interface Point2D {
    x: number;
    y: number;
}
/**
 * AI消息结构体
 */
export interface AIMessage {
    role: string;   // 消息角色（system/user/assistant）
    content: string; // 消息内容
}

/**
 * 聊天请求参数接口
 */
export interface ChatRequest {
    model: string;         // 指定使用的AI模型
    messages: AIMessage[];  // 消息历史记录
    temperature?: number;   // 生成多样性参数（0-1）
    maxTokens?: number;     // 最大生成token数
}

export interface Live2DIndicator{
    speakerKey: string, // 说话人识别键
    live2DKey: string, // live2D识别键
}

interface screenCharacter{
    path: string, // 角色路径
    id: number, // 角色ID
    position: Point2D, // 角色位置
    lastPosition: Point2D, // 角色上次位置
}

/**
 * 解析后的AI反馈数据结构
 * 包含了说话人、live2D指令、背景、BGM、场景切换等信息
 * speaker: 说话人列表
 * live2D: live2D指令列表
 * bg: 背景指令
 * bgm: BGM指令
 * scene: 场景切换指令
 * content: 纯净对话文本
 * rawContent: 原始反馈内容
 * memory: 记忆内容
 */
export interface AnalyzedFeedback {
    speaker: string[],    // 说话人
    live2D: Live2DIndicator[], // 说话人和live2D指令
    bg: string,         // 背景指令
    bgm: string,        // BGM指令
    scene: string,      // 场景切换指令
    content: string,    // 纯净对话文本（去除指令标记）
    rawContent: string,  // 原始反馈内容
    memory: string,      // 记忆内容
}

export class AIPromptGenerator {
    /**
     * 获取格式约束提示
     */
    public GetFormatPrompt() {
        return aiConfig.formatPrompt; // 直接返回配置中的格式提示
    }


    /**
     * 生成角色设定提示
     * 处理逻辑：
     * 1. 遍历所有解析的角色卡片
     * 2. 将角色描述中的{{char}}替换为实际角色名
     * 3. 构建系统消息数组
     */
    public GetCharacterPrompt() {
        let retMessage: AIMessage[] = [];
        for (let characterItem of parsedCardManager.characters) {
            retMessage.push({
                role: "system",
                content: characterItem.description.replace(/{{char}}/g, characterItem.name)
            });
        }
        return retMessage;
    }

    public GetLorePrompt(searchRange: AIMessage[]) {
        let activatedLoreList: AILoreItemExpanded[] = [];
        // 初始化带处理状态的知识库副本
        let lores: AILoreItemExpanded[] = parsedCardManager.lorebooks.map((e) => ({ ...e, processed: false }));

        //常驻世界书
        activatedLoreList.push(...this.SearchConstantLore(lores));

        // 主搜索流程
        for (const searchMono of searchRange) {
            activatedLoreList.push(...this.SearchGeneralLore(searchMono, lores));
        }

        // 递归搜索队列处理
        let toSearchQueue: AILoreItemExpanded[] = [];
        for (const lore of activatedLoreList) {
            if (!lore.preventRecursion) toSearchQueue.push(lore);
        }
        while (toSearchQueue.length !== 0) {
            const currentMessage = toSearchQueue.pop()?.content || "";
            let retL = this.SearchGeneralLoreWithRecursion(currentMessage, lores);
            activatedLoreList.push(...retL);
            toSearchQueue.push(...retL);
        }
        logger.debug("递归队列空，世界书搜索已完成。");
        return activatedLoreList;
    }

    // 以下为私有辅助方法 //

    /**
     * 递归搜索关联知识条目
     * @param message 待分析文本内容
     * @param lores 知识库全集
     */
    private SearchGeneralLoreWithRecursion(message: string, lores: AILoreItemExpanded[]) {
        let retL: AILoreItemExpanded[] = [];
        for (const lore of lores) {
            if (lore.processed || !lore.enabled || lore.excludeRecursion) continue;
            for (const key of lore.keys) {
                if (message.includes(key)) {
                    retL.push(lore);
                    lore.processed = true;
                    break;
                }
            }
        }
        return retL;
    }

    /**
     * 检索常驻知识条目
     */
    private SearchConstantLore(lores: AILoreItemExpanded[]) {
        let retL: AILoreItemExpanded[] = [];
        for (const lore of lores) {
            if (lore.processed) continue;
            if (lore.enabled && lore.constant) {
                retL.push(lore);
                lore.processed = true;
            }
        }
        return retL;
    }

    /**
     * 通用知识条目检索
     */
    private SearchGeneralLore(message: AIMessage, lores: AILoreItemExpanded[]) {
        let retL: AILoreItemExpanded[] = [];
        for (const lore of lores) {
            if (lore.processed) continue;
            if (!lore.enabled || lore.constant) continue;
            for (const key of lore.keys) {
                if (message.content.includes(key)) {
                    retL.push(lore);
                    lore.processed = true;
                    break;
                }
            }
        }
        return retL;
    }
}


/**
 * AI消息处理器
 * 职责：解析/构建完整的对话消息
 */
export class AIMessageDealer {
    /**
     * 从反馈文本提取live2D和说话人指令
     */
    public GetLive2D(feedback: string) {
        const live2DStr =  this.extractTagContent(feedback, aiConfig.live2DFrontMatch, aiConfig.live2DBackMatch);
        const live2DList = live2DStr?.split(aiConfig.live2DSpliter) || null;
        if(live2DList == null) return [];
        let Live2DIndicatorList: Live2DIndicator[] = [];
        for(let live2D of live2DList){
            if(isEmptyString(live2D)) continue;
            const [speaker, live2DKey] = live2D.split(new RegExp(`[${aiConfig.live2DSpeakerIndicator}]`));
            if (!isEmptyString(speaker) && !isEmptyString(live2DKey)) {
                Live2DIndicatorList.push({
                    speakerKey: speaker,
                    live2DKey: live2DKey
                });
            }
        }
        return Live2DIndicatorList;
    }

    /**
     * 提取说话人指令
     */
    public GetSpeaker(feedback: string) {
        const speakerList = this.extractTagContent(feedback, aiConfig.speakerFrontMatch, aiConfig.speakerBackMatch);
        return speakerList?.split(aiConfig.speakerSpliter) || [];
    }

    /**
     * 提取背景指令
     */
    public GetBg(feedback: string) {
        return this.extractTagContent(feedback, aiConfig.bgFrontMatch, aiConfig.bgBackMatch);
    }

    /**
     * 提取BGM指令
     */
    public GetBgm(feedback: string) {
        return this.extractTagContent(feedback, aiConfig.bgmFrontMatch, aiConfig.bgmBackMatch);
    }

    /**
     * 提取场景切换指令
     */
    public Getscene(feedback: string) {
        return this.extractTagContent(feedback, aiConfig.sceneFrontMatch, aiConfig.sceneBackMatch);
    }

    /**
     * 获取记忆区
     */
    public GetMemory(feedback: string) {
        return this.extractTagContent(feedback, aiConfig.memoryFrontMatch, aiConfig.memoryBackMatch);
    }

    /**
     * 获取纯净对话文本（移除所有指令标记）
     */
public GetPureFeedback(feedback: string): string {
    // 显式创建字符串副本
    let pureContent = feedback.slice(); 
    
    // 预编译所有正则表达式
    const patterns = [
        { front: aiConfig.speakerFrontMatch, back: aiConfig.speakerBackMatch },
        { front: aiConfig.live2DFrontMatch, back: aiConfig.live2DBackMatch },
        { front: aiConfig.bgFrontMatch, back: aiConfig.bgBackMatch },
        { front: aiConfig.bgmFrontMatch, back: aiConfig.bgmBackMatch },
        { front: aiConfig.sceneFrontMatch, back: aiConfig.sceneBackMatch },
        { front: aiConfig.memoryFrontMatch, back: aiConfig.memoryBackMatch },
    ]
    .filter(({ front, back }) => 
        typeof front === 'string' && 
        typeof back === 'string' &&
        front.length > 0 &&
        back.length > 0
    )
    .map(({ front, back }) => {
        const escapedFront = this.escapeRegExp(front);
        const escapedBack = this.escapeRegExp(back);
        return new RegExp(`${escapedFront}.*?${escapedBack}`, 'gs');
    });

    // 单次替换所有模式
    patterns.forEach(pattern => {
        pureContent = pureContent.replace(pattern, '');
    });

    // 清理残留空白（可选）
    return pureContent.replace(/\s{2,}/g, ' ').trim();
}

    /**
     * 获取完整解析后反馈
     */
    public GetAllFeedback(feedback: string) {
        const analyzedFeedback: AnalyzedFeedback = {
            speaker: this.GetSpeaker(feedback),
            live2D: this.GetLive2D(feedback),
            bg: this.GetBg(feedback) || "",
            bgm: this.GetBgm(feedback) || "",
            scene: this.Getscene(feedback) || "",
            content: this.GetPureFeedback(feedback),
            rawContent: feedback,
            memory: this.GetMemory(feedback) || "",
        }
        return analyzedFeedback;
    }

    /**
     * 构建完整提示词序列
     * 结构顺序：
     * 1. 系统前置提示
     * 2. 格式约束
     * 3. 角色前知识
     * 4. 角色设定
     * 5. 角色后知识
     * 6. 对话历史+嵌入对话历史的知识
     * 7. 当前输入
     * 8. 系统后置提示
     */
    public CreateFullPrompt(frontPrompt: string, formatPrompt: string, charaContent: AIMessage[],
        histroyContent: AIMessage[], loreContent: AILoreItem[], sayPrompt: string, backPrompt: string) {
        // 知识条目排序（位置>深度>顺序）
        let sortedLoreContent = loreContent.sort((a, b) => {
            if (a.position !== b.position) {
                return a.position - b.position; // Ascsceneing order by position
            } else if (a.depth !== b.depth) {
                return b.depth - a.depth; // Descsceneing order by depth
            } else {
                return a.order - b.order; // Ascsceneing order by order
            }
        });
        let messages: AIMessage[] = [...histroyContent];

        // 插入位置特定的知识条目
        for (const lore of sortedLoreContent) {
            if (lore.position == 4) {
                let insertIndex = lore.depth;
                if (insertIndex > messages.length) insertIndex = messages.length;
                insertFromBack(messages, convertLoreToAIMessage(lore), insertIndex);
            }
        }

        // 组装完整提示序列
        messages = [
            { role: "system", content: frontPrompt },
            { role: "system", content: formatPrompt },
            ...this.getBeforeCharLorePrompt(sortedLoreContent),
            ...charaContent,
            ...this.getAfterCharLorePrompt(sortedLoreContent),
            ...messages,
            { role: "user", content: sayPrompt },
            { role: "user", content: backPrompt },
        ]

        return messages;
    }

    // 私有辅助方法 //
private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

private extractTagContent(text: string, front: string, back: string): string | null {
    if (front === '' || back === '') return null; // 处理空边界
    
    const escapedFront = this.escapeRegExp(front);
    const escapedBack = this.escapeRegExp(back);
    const regex = new RegExp(`${escapedFront}(.*?)${escapedBack}`);
    const match = text.match(regex);
    return match ? match[1] : null;
}

    //角色前知识
    private getBeforeCharLorePrompt(loreContent: AILoreItem[]) {
        let retMessages: AIMessage[] = [];
        for (const lore of loreContent) {
            if (lore.position == 0) {
                const retMessage = {
                    role: lore.role,
                    content: lore.content,
                }
                retMessages.push(retMessage);
            }
        }
        return retMessages;
    }

    //角色后知识
    private getAfterCharLorePrompt(loreContent: AILoreItem[]) {
        let retMessages: AIMessage[] = [];
        for (const lore of loreContent) {
            if (lore.position == 1) {
                const retMessage = {
                    role: lore.role,
                    content: lore.content,
                }
                retMessages.push(retMessage);
            }
        }
        return retMessages;
    }
}

export class AIMessageDispatcher {
    public lastBgUrl = "";       // 最近使用的背景
    public lastBgmUrl = "";      // 最近使用的BGM
    public lastSceneUrl = "";    // 最近切换的场景
    public lastSpeaker = "";     // 最近的说话人
    public UUIDForSentence = ""; // 当前单句ID
    public UUIDForParagraph = ""; // 当前单次回复ID
    public screenFigures: screenCharacter[] = []; // 当前屏幕上的角色列表


    /**
     * 初始化
     */
    public newSentenceIni() {
        this.UUIDForSentence = generateUUID();
    }
    public newParagraphIni() {
        this.UUIDForParagraph = generateUUID();
    }

    /**
     * 分发场景切换指令
     */
    public dispatchSceneSentence(url: string | null) {
        if (url == null) {
            logger.warn("Null scene url,dispatch rejected.");
            return;
        }
        if (!aiConfig.sceneAllowRepeat && url == this.lastSceneUrl) return;
        let GeneratedForScene: ISentence = {
            command: commandType.changeScene,
            commandRaw: 'changeScene',
            content: "./game/scene/" + url,
            args: [],
            sentenceAssets: [],
            subScene: ["./game/scene/" + url]
        }
        webgalStore.dispatch(AiActions.addGeneratedSentence(GeneratedForScene));
        this.lastSceneUrl = url;
    }

    /**
     * 分发对话文本指令
     */
    public dispatchSaySentence(speaker:string,fullFeedback:string, content: string) {
        if (isEmptyString(speaker)) speaker = this.lastSpeaker;
        let AiGeneratedSentence: ISentence = {
            command: commandType.say, // 语句类型
            commandRaw: 'say', // 命令原始内容，方便调试
            content: content, // 语句内容
            args: [{ key: "speaker", value: speaker}],
            sentenceAssets: [], // 语句携带的资源列表
            subScene: [], // 语句携带的子场景
        }
        if (AiGeneratedSentence.args[0].value == "") AiGeneratedSentence.args = [];
        AiGeneratedSentence.args.push({ key: "AiFullShowText", value: fullFeedback },
            { key: "AiShowTextUUIDForSentence", value: this.UUIDForSentence },
            { key: "AiShowTextUUIDForParagraph", value: this.UUIDForParagraph });
        webgalStore.dispatch(AiActions.addGeneratedSentence(AiGeneratedSentence));
        this.lastSpeaker = speaker;
    }
    /**
     * 分发背景切换指令
     */
    public dispatchBackgroundSentence(url: string | null) {
        if (url == null) {
            logger.warn("Null bg url,dispatch rejected.");
            return;
        }
        if (!aiConfig.bgAllowRepeat && url == this.lastBgUrl) return;
        const parsedUrl = assetSetter(url, fileType.background);
        let assetToLoad: IAsset = {
            lineNumber: 0, name: parsedUrl,
            type: fileType.background, url: parsedUrl
        }
        let GeneratedForBg: ISentence = {
            command: commandType.changeBg,
            commandRaw: 'changeBg',
            content: parsedUrl,
            args: [{ key: 'next', value: true }],
            sentenceAssets: [assetToLoad],
            subScene: []
        }
        webgalStore.dispatch(AiActions.addGeneratedSentence(GeneratedForBg));
        this.lastBgUrl = url;
    }

    /**
     * 分发bgm切换指令
     */
    public dispatchBgmSentence(url: string | null) {
        if (url == null) {
            logger.warn("Null bgm url,dispatch rejected.");
            return;
        }
        if (!aiConfig.bgmAllowRepeat && url == this.lastBgmUrl) return;
        const parsedUrl = assetSetter(url, fileType.bgm);
        let assetToLoad: IAsset = {
            lineNumber: 0, name: parsedUrl,
            type: fileType.background, url: parsedUrl
        }
        let GeneratedForBgm: ISentence = {
            command: commandType.bgm,
            commandRaw: 'bgm',
            content: parsedUrl,
            args: [{ key: 'next', value: true }],
            sentenceAssets: [assetToLoad],
            subScene: []
        }
        webgalStore.dispatch(AiActions.addGeneratedSentence(GeneratedForBgm));
        this.lastBgmUrl = url;
    }

    /**
     * 分发live2D切换指令
     */
    public dispatchFigureSentences(live2dFeatures: AILive2DFeature[], defaultPaths: string[]) {
        if(live2dFeatures.length == 0 || defaultPaths.length == 0) {
            logger.warn("Empty live2DList,dispatch rejected.");
            return;
        }
        this.deleteScreenFigureByCompare(defaultPaths);
        this.addScreenFigureByCompare(defaultPaths);
        this.makeScreenFigurePosition();
        for(let i=0; i<live2dFeatures.length; i++)
        {
            const feature = live2dFeatures[i];
            const defaultPath = defaultPaths[i];
            const figure = this.checkScreenFigureByPath(defaultPath);
            if(figure != null)
            {
                this.dispatchFigureMonoSentence(feature, defaultPath, figure.position, figure.id);
            }
            else{
                logger.error("Screen figure not found,Bad Code Logic!",this.screenFigures);
            }
        }
    }

    private makeScreenFigurePosition() {
        const leftBorder = aiConfig.screenBorderLeft;
        const rightBorder = aiConfig.screenBorderRight;
        const gap = aiConfig.standardCharacterGap;
        const totalFigures = this.screenFigures.length;

        if (totalFigures === 0) return; // 处理无图形情况

        const totalWidth = rightBorder - leftBorder;
        const actualGap = totalFigures > 1 ? Math.min(gap, totalWidth / (totalFigures - 1)) : 0;

        // 计算居中起始位置
        const startX = leftBorder + (totalWidth - (totalFigures - 1) * actualGap) / 2;

        for (let i = 0; i < totalFigures; i++) {
            const x = totalFigures === 1 ? leftBorder + totalWidth / 2 : startX + i * actualGap;
            this.screenFigures[i].position = { x, y: 0 };
        }
    }

    private getValidScreenCharacterId()
    {
        let usedIds = new Set<number>();
        for(let i = 0; i < this.screenFigures.length; i++)
        {
            usedIds.add(this.screenFigures[i].id);
        }
        let id = 0;
        while(usedIds.has(id))
        {
            id++;
            if(id >= 1000)
            {
                logger.error("Screen figure ID overflow, Bad Code Logic!", this.screenFigures);
                break;
            }
        }
        return id;
    }

    private addScreenFigureByCompare(comparePaths:string[])
    {
        for(let i = 0; i < comparePaths.length; i++)
        {
            const path = comparePaths[i];
            if(this.checkScreenFigureByPath(path) == null)
            {
                this.addMonoScreenFigure(path);
            }
        }
    }

    private addMonoScreenFigure(path:string)
    {
        const figure = this.checkScreenFigureByPath(path);
        if(figure == null)
        {
            const id = this.getValidScreenCharacterId();
            const newFigure: screenCharacter = {
                path: path,
                id: id,
                position: zeroPoint,
                lastPosition: zeroPoint,
            }
            // 随机插入到 screenFigures 的某个位置
            const insertIndex = Math.floor(Math.random() * (this.screenFigures.length + 1));
            this.screenFigures.splice(insertIndex, 0, newFigure);
        }
    }

    private deleteScreenFigureByCompare(comparePaths:string[])
    {
        let toDeleteIndexes:number[] = [];
        for(let i = 0; i < this.screenFigures.length; i++)
        {
            const figure = this.screenFigures[i];
            if(!comparePaths.includes(figure.path))
            {
                toDeleteIndexes.push(i);
            }
        }
        for(let i = toDeleteIndexes.length - 1; i >= 0; i--)
        {
            this.dispatchFigureRemoveSentence(this.screenFigures[toDeleteIndexes[i]].id);
            this.screenFigures.splice(toDeleteIndexes[i],1);
        }
    }

    private checkScreenFigureByPath(path: string) {
        for (const figure of this.screenFigures) {
            if (figure.path == path) {
                return figure;
            }
        }
        return null;
    }

    private checkScreenFigureByID(id: number) {
        for (const figure of this.screenFigures) {
            if (figure.id == id) {
                return figure;
            }
        }
        return null;
    }

    private dispatchFigureMonoSentence(live2dFeatures: AILive2DFeature, defaultPath: string, position: Point2D, id: number) {
        if (live2dFeatures && defaultPath) {
            const feature = live2dFeatures;
            let GeneratedForFigure: ISentence = {
                command: commandType.changeFigure,
                commandRaw: 'changeFigure',
                content: "./game/figure/" + defaultPath,
                args: [{ key: 'motion', value: feature.motion }, 
                    { key: 'expression', value: feature.expression }, 
                    { key: 'next', value: true },
                    { key: 'transform', value: `{"position":{"x":${position.x},"y":${position.y}}}` },
                    { key: 'id', value: id },
                ],
                sentenceAssets: [{
                    lineNumber: 0, name: './game/figure/' + defaultPath,
                    type: fileType.figure, url: './game/figure/' + defaultPath
                }],
                subScene: []
            }
            if (feature.path != "") GeneratedForFigure.content = "./game/figure/" + feature.path;
            webgalStore.dispatch(AiActions.addGeneratedSentence(GeneratedForFigure));
            const target = this.checkScreenFigureByID(id);
            if(target != null && target.lastPosition.x != position.x)
            {
                let GeneratedForEffect: ISentence = {
                    command: commandType.setTransform,
                    commandRaw: 'setTransform',
                    content: `{"position":{"x":${position.x},"y":${position.y}}}`,
                    args: [{ key: 'target', value: id }, { key: 'next', value: true }, 
                        {key:'duration',value: aiConfig.positionChangeFactor*Math.abs(target.lastPosition.x-position.x)}],
                    sentenceAssets: [],
                    subScene: []
                }
                webgalStore.dispatch(AiActions.addGeneratedSentence(GeneratedForEffect));
                target.lastPosition = target.position;
            }
        }
        else {
            logger.warn("Null live2d url,dispatch rejected.");
        }
    }

    private dispatchFigureRemoveSentence(id: number) {
        let RemoveFigure: ISentence = {
                command: commandType.changeFigure,
                commandRaw: 'changeFigure',
                content:"",
                args: [{ key: 'id', value: id },{ key: 'next', value: true }],
                sentenceAssets: [],
                subScene: []
            }
            webgalStore.dispatch(AiActions.addGeneratedSentence(RemoveFigure));
    }
}

/**
 * 对话记忆管理器
 * 处理对话历史记录
 */
export class AIMemorizer {
    private lastDecodedID: string = generateUUID();
    public getLastNBacklog(countN: number) {
        let count = 0;
        let retMessages: AIMessage[] = [];
        const backlog = WebGAL.backlogManager.getBacklog();
        for (let i = backlog.length - 1; i >= 0; i--) {
            const monoBacklog = backlog[i];
            if (this.isQuailifiedBacklog(monoBacklog)) {
                retMessages.unshift(this.decodeMonoBacklog(monoBacklog));
                count++;
                if (count >= countN) break;
            }
        }
        return retMessages;
    }

    private decodeMonoBacklog(monoBackLog: IBacklogItem) {
        let retMessage: AIMessage = {
            role: "",
            content: "",
        }
        const id = monoBackLog.currentStageState.aiShowTextUUIDForParagraph;
        if (monoBackLog.currentStageState.showName == aiConfig.userName) {
            retMessage.role = "user";
            retMessage.content = monoBackLog.currentStageState.showText;
        }
        else if (id != "" && id != null) {
            retMessage.role = "assistant";
            retMessage.content = monoBackLog.currentStageState.aiFullShowText;
            this.lastDecodedID = id;
        }
        else {
            retMessage.role = "system";
            retMessage.content = monoBackLog.currentStageState.showName + ":" + monoBackLog.currentStageState.showText;
        }
        return retMessage;
    }

    private isQuailifiedBacklog(monoBackLog: IBacklogItem) {
        if (monoBackLog.currentStageState.aiShowTextUUIDForParagraph == this.lastDecodedID) return false;
        if (monoBackLog.currentStageState.showText == "") return false;
        if (monoBackLog.currentStageState.showText == aiConfig.waitingInfo) return false;
        if (monoBackLog.currentStageState.showName == "debuggerInfo") return false;
        return true;
    }
}

// 全局服务实例导出
export const aiMessageDealer = new AIMessageDealer();     // 消息处理器
export const aiMessageLauncher = new AIMessageDispatcher(); // 指令分发器
export const aiMemorizer = new AIMemorizer();            // 记忆管理器
export const aiPromptGenerator = new AIPromptGenerator(); // 提示生成器