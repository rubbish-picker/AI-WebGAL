import { webgalStore } from "@/store/store";
import { AiActions } from "./AIReducer";
import { IAiSentenceState } from "./AIInterface";
import { nextSentence } from "@/Core/controller/gamePlay/nextSentence";
import { AILive2DFeature, characterTable } from "./AICharacter";
import axios from "axios";
import { aiMemorizer, aiMessageDealer, aiMessageLauncher, aiPromptGenerator, ChatRequest, Point2D } from "./AIMessage";
import { isEmptyString, splitOverflowText } from "./utils";
import { backgroundTable } from "./AIBackground";
import { bgmTable } from "./AIMusic";
import { sceneChangeTable } from "./AIScene";
import { WebGAL } from "@/Core/WebGAL";
import { aiConfig } from "./AIConfig";
import { logger } from "@/Core/util/logger";

// API 配置
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * AI响应处理核心函数
 * @param sentence AI对话状态对象，包含当前交互的配置信息
 * 功能流程：
 * 1. 构建完整提示词
 * 2. 调用AI接口获取响应
 * 3. 解析响应内容
 * 4. 生成游戏指令序列
 */
export async function AIres(sentence: IAiSentenceState) {
    // 构建提示词组件
    const AiStateUUID = webgalStore.getState().AI.uuid; // 获取当前AI状态的UUID
    const formatPrompt = aiPromptGenerator.GetFormatPrompt();     // 获取格式约束提示
    const charaContent = aiPromptGenerator.GetCharacterPrompt(); // 角色设定提示
    const histroyContent = aiMemorizer.getLastNBacklog(          // 最近N条对话历史
        aiConfig.contextItemLength
    );
    const loreContent = aiPromptGenerator.GetLorePrompt(         // 知识库关联提示
        aiMemorizer.getLastNBacklog(aiConfig.loreSearchLength)
    );

    // 组合完整提示词（遵循: 系统前提示+格式+角色+历史+知识库+句子本体携带的prompt+系统后提示）
    const fullPrompt = aiMessageDealer.CreateFullPrompt(
        aiConfig.frontPrompt,
        formatPrompt,
        charaContent,
        histroyContent,
        loreContent,
        sentence.prompt,
        aiConfig.backPrompt
    );
    logger.debug("fullPrompt created", fullPrompt);

    // 调用AI接口获取原始响应
    let feedback = await chatWithOpenRouter({
        model: sentence.model,
        messages: fullPrompt,
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
    });
    if(webgalStore.getState().AI.uuid != AiStateUUID)
    {
        logger.warn("任意读档行为发生，当前ai对话被丢弃。",{old:AiStateUUID,now:webgalStore.getState().AI.uuid});
        return;
    }

    // 更新状态标记完成
    webgalStore.dispatch(AiActions.finishAiSentenceByid({
        id: sentence.id,
        response: feedback
    }));
    logger.info("Ai Sentence finished", sentence);

    aiMessageLauncher.newParagraphIni(); // 新回复初始化
    // 多对话分割处理（使用配置的分隔符）
    const dialog = feedback.split(aiConfig.paragraphSpliter);
    for (let j = 0; j < dialog.length; j++) {
        let monoFeedback = dialog[j];
        if (isEmptyString(monoFeedback)) continue;

        // 添加分隔符保持原始格式（最后一条除外）
        if (j !== dialog.length - 1) monoFeedback += aiConfig.paragraphSpliter;

        logger.debug("Ai Sentence construction started. index:" + j, monoFeedback)

        // 解析反馈内容（提取角色/背景/BGM等指令）
        const analysedFeedback = aiMessageDealer.GetAllFeedback(monoFeedback);

        // 说话人处理
        let speakerStr = "";
        for(const speaker of analysedFeedback.speaker)
        {
            if(characterTable.getCharacterByName(speaker, aiConfig.speakerUseStrict) == null) continue;
            if (speakerStr.length > 0) speakerStr += aiConfig.speakerSpliter;
            speakerStr += characterTable.getCharacterByName(speaker, aiConfig.speakerUseStrict)?.speaker;
        }
        logger.info("speaker name got from AI feedback.", speakerStr);

        // Live2D处理流程
        let live2dFeaturesList:AILive2DFeature[] = [];
        let defaultPathList:string[] = [];
        if (sentence.forFigure) {
            for(const live2D of analysedFeedback.live2D)
            {
                const defaultPath = characterTable.getCharacterByName(live2D.speakerKey)?.defaultPath || null;
                const live2DFeatures = characterTable.getExpByNameAndKey(live2D.speakerKey, live2D.live2DKey, aiConfig.live2DUseStrict);
                
                if(defaultPath == null || live2DFeatures == null) continue;
                const randomIndex = Math.floor(Math.random() * live2DFeatures.length);
                const live2DFeature = live2DFeatures[randomIndex];
                live2dFeaturesList.push(live2DFeature);
                defaultPathList.push(defaultPath);
            }
            logger.info("live2D defaultPath got from AI feedback.",defaultPathList);
            logger.info("live2D features got from AI feedback.",live2dFeaturesList);
        }

        // 背景处理
        let bgUrl = null;
        if (sentence.forBackground) {
            const bgKey = analysedFeedback.bg;
            bgUrl = backgroundTable.getBg(bgKey, aiConfig.bgUseStrict);
            if(bgUrl) logger.info("background path got from AI feedback.", bgUrl);
        }

        // BGM处理
        let bgmUrl = null;
        if (sentence.forMusic) {
            const bgmKey = analysedFeedback.bgm;
            bgmUrl = bgmTable.getBgm(bgmKey, aiConfig.bgmUseStrict);
            if(bgmUrl) logger.info("bgm path got from AI feedback.", bgmUrl);
        }

        // 场景切换处理
        let sceneUrl = null;
        if (sentence.forScene) {
            const sceneKey = analysedFeedback.scene;
            sceneUrl = sceneChangeTable.getSceneChange(
                WebGAL.sceneManager.sceneData.currentScene.sceneName,
                sceneKey,
                aiConfig.sceneUseStrict
            );
            if(sceneUrl) logger.info("scene path got from AI feedback.", sceneUrl);
        }

        // 指令分发流水线
        //init
        aiMessageLauncher.newSentenceIni();

        //dispatch
        if (sentence.forMusic) aiMessageLauncher.dispatchBgmSentence(bgmUrl);    // 音乐指令入队
        if (sentence.forBackground) aiMessageLauncher.dispatchBackgroundSentence(bgUrl); // 背景指令入队

        // 长文本分页处理（最大78字符）
        const splitFeedback = splitOverflowText(analysedFeedback.content, 78);
        for (let i = 0; i < splitFeedback.length; i++) {
            if (sentence.forFigure) 
            {
                aiMessageLauncher.dispatchFigureSentences(live2dFeaturesList, defaultPathList); // Live2D指令
            }
            if(sentence.forDialogue)
            {
                aiMessageLauncher.dispatchSaySentence(speakerStr,feedback,splitFeedback[i]); // 对话文本
            }
        }

        if (sentence.forScene) aiMessageLauncher.dispatchSceneSentence(sceneUrl); // 场景切换（最后执行）

        logger.debug("Ai Sentence dispatch completed. index:" + j, analysedFeedback);
    }

    // 自动推进到下一条（除非配置为需要点击后）
    if (!sentence.showAfterPoint) nextSentence();
    logger.info("AI完整回复：" + feedback);
}

/**
 * OpenRouter接口调用封装
 * @param request 聊天请求参数
 * @returns 解析后的AI响应文本
 * 异常处理策略：
 * - 网络错误：记录详细日志
 * - API错误：抛出原始异常由上层处理
 */
async function chatWithOpenRouter(request: ChatRequest): Promise<string> {
    try {
        for(let i=0;i<=aiConfig.APIMaxTryingLimit;i++)
        {
            let response = await axios.post(API_URL, request, {
            headers: {
                'Authorization': `Bearer ${aiConfig.APIKey}`,
            }
            });
            // 提取响应内容（适配OpenRouter数据结构）
            if(response.data.choices[0].message.content!="")
            {
                logger.debug("API response successful", response);
                return response.data.choices[0].message.content;
            }
            else{
                logger.warn(`Empty API response! Trying again ${i}/${aiConfig.APIMaxTryingLimit}`);
            }
        }
        logger.error(`MaxTryingLimit ${aiConfig.APIMaxTryingLimit} Exceeded. Trying Stop. Bad API Response!`);
        logger.error("1.If you are always encountering this problem, check your backprompt and make sure it is not empty. As some platforms like openrouter may give empty feedback if few user prompts or too many empty user prompts are provided. Backprompt is set to the user role for the same reason.");
        logger.error("2.If you are asking for NSFW contents and using Gemini, the problem may be caused by Gemini's truncation of the response. Try to use other models or alter your prompts.");
        return "";
    } catch (error) {
        // 分类错误处理
        if (axios.isAxiosError(error)) {
            logger.error('API Error:', error.response?.data); // 记录API返回的错误体
        } else {
            logger.error('Unexpected API network Error:', error); // 未知错误类型
        }
        throw error; // 重新抛出供业务层处理
    }
}