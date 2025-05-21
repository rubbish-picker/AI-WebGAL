import { logger } from "@/Core/util/logger";

// AI 系统配置管理类
export class AIConfig {
    // ====================== 匹配规则配置 ======================
    // Live2D匹配规则
    public live2DFrontMatch: string = "<<<"; // live2d标识起始标记
    public live2DBackMatch: string = ">>>";  // live2d标识结束标记
    public live2DSpliter: string = "|"; // live2d分隔符
    public live2DSpeakerIndicator: string[] = [":","："]; // live2d说话人指示符
    public live2DUseStrict: boolean = false; // 是否严格匹配live2d

    // 说话人匹配规则
    public speakerFrontMatch: string = "<<<"; // 说话人标识起始标记
    public speakerBackMatch: string = ">>>";  // 说话人标识结束标记
    public speakerSpliter: string = "|"; // 说话人分隔符
    public speakerUseStrict: boolean = false; // 是否严格匹配说话人

    // 背景匹配规则
    public bgFrontMatch: string = "<<<";     // 背景标识起始标记
    public bgBackMatch: string = ">>>";      // 背景标识结束标记
    public bgUseStrict: boolean = false;     // 是否严格匹配背景
    public bgAllowRepeat: boolean = false;   // 是否允许背景重复出现（与前一次相比）

    // BGM匹配规则
    public bgmFrontMatch: string = "<<<";    // BGM标识起始标记
    public bgmBackMatch: string = ">>>";     // BGM标识结束标记
    public bgmUseStrict: boolean = false;    // 是否严格匹配BGM
    public bgmAllowRepeat: boolean = false;  // 是否允许BGM重复（与前一次相比）

    // 场景匹配规则
    public sceneFrontMatch: string = "<<<";  // 场景标识起始标记
    public sceneBackMatch: string = ">>>";   // 场景标识结束标记
    public sceneUseStrict: boolean = false;  // 是否严格匹配场景
    public sceneAllowRepeat: boolean = false;// 是否允许场景重复（与前一次相比）

    // 记忆块匹配规则
    public memoryFrontMatch: string = "[[["; // 记忆起始标记
    public memoryBackMatch: string = "]]]";  // 记忆结束标记

    // 分隔符
    public paragraphSpliter: string = ">>>"; // 多角色对话分隔符
    public sentenceSpliter: string[] = ["。", "！", "？", ".", "!", "?", "\n", "；", ";", "）", ")", "】", "]", "》", ">"];
    public closePunctuation: string[] = ["”", "’", "》", "】", "）", "]", ")", ">", "\"", "'", "）", "」"];

    // ====================== 提示词配置 ======================
    public backPrompt: string = "";          // 系统级后置提示词（追加在末尾）
    public frontPrompt: string = "";         // 系统级前置提示词（添加在开头）
    public formatPrompt: string = "";        // 输出格式约束提示

    // ====================== 用户界面配置 ======================
    public userName: string = "你";          // 用户显示名称
    public waitingInfo: string = "waiting for AI response..."; // 等待提示文本

    // ====================== 上下文配置 ======================
    public contextItemLength: number = 10;   // 保留的上下文对话轮数
    public loreSearchLength: number = 2;     // 知识库关联条目数

    // ====================== 模型参数配置 ======================
    public temperature: number = 0.7;        // 生成多样性（0-1）
    public maxTokens: number = 10000;        // 单次请求最大token数
    public model: string = "anthropic/claude-3.7-sonnet"; // 默认模型名称

    //API配置
    public APIMaxTryingLimit: number = 1;
    public APIKey: string = ""; // API密钥

    // ====================== 其他配置 ======================
    public screenBorderLeft:number = -1300;
    public screenBorderRight:number = 1300;
    public standardCharacterGap:number = 600;
    public positionChangeFactor:number = 1; // 位置变化速率因子

    /**
     * 加载控制类配置（匹配规则相关）
     * @param raw_content - 包含控制参数的原始配置对象
     * 注意：所有布尔值字段需要接收"true"字符串转为true
     */
    public addControlConfig(raw_content: any) {
        // live2d配置
        this.live2DFrontMatch = raw_content.live2d_front_match;
        this.live2DBackMatch = raw_content.live2d_back_match;
        this.live2DSpliter = raw_content.live2d_spliter;
        this.live2DSpeakerIndicator = raw_content.live2d_speaker_indicator;
        this.live2DUseStrict = raw_content.live2d_use_strict == "true";

        // 说话人配置
        this.speakerFrontMatch = raw_content.speaker_front_match;
        this.speakerBackMatch = raw_content.speaker_back_match;
        this.speakerSpliter = raw_content.speaker_spliter;
        this.speakerUseStrict = raw_content.speaker_use_strict == "true";

        // 背景配置
        this.bgFrontMatch = raw_content.bg_front_match;
        this.bgBackMatch = raw_content.bg_back_match;
        this.bgUseStrict = raw_content.bg_use_strict == "true";
        this.bgAllowRepeat = raw_content.bg_allow_repeat == "true";

        // BGM配置
        this.bgmFrontMatch = raw_content.bgm_front_match;
        this.bgmBackMatch = raw_content.bgm_back_match;
        this.bgmUseStrict = raw_content.bgm_use_strict == "true";
        this.bgmAllowRepeat = raw_content.bgm_allow_repeat == "true";

        // 场景配置
        this.sceneFrontMatch = raw_content.scene_front_match;
        this.sceneBackMatch = raw_content.scene_back_match;
        this.sceneUseStrict = raw_content.scene_use_strict == "true";
        this.sceneAllowRepeat = raw_content.scene_allow_repeat == "true";

        // 记忆块配置
        this.memoryFrontMatch = raw_content.memory_front_match;
        this.memoryBackMatch = raw_content.memory_back_match;

        //分隔符
        this.paragraphSpliter = raw_content.paragraph_spliter;
        this.sentenceSpliter = raw_content.sentence_spliter;
        this.closePunctuation = raw_content.close_punctuation;

        // 其他配置
        this.screenBorderLeft = raw_content.screen_border_left;
        this.screenBorderRight = raw_content.screen_border_right;
        this.standardCharacterGap = raw_content.standard_character_gap;
        this.positionChangeFactor = raw_content.position_change_factor;
    }

    /**
     * 加载全局配置（模型参数/提示词相关）
     * @param raw_content - 包含全局参数的原始配置对象
     * 使用空值合并运算符保持默认值
     */
    public addGlobalConfig(raw_content: any) {
        this.frontPrompt = raw_content.front_prompt ?? this.frontPrompt;
        this.backPrompt = raw_content.back_prompt ?? this.backPrompt;
        this.formatPrompt = raw_content.format_prompt ?? this.formatPrompt;
        this.model = raw_content.model ?? this.model;
        this.temperature = raw_content.temperature ?? this.temperature;
        this.maxTokens = raw_content.max_tokens ?? this.maxTokens;
        this.userName = raw_content.user_name ?? this.userName;
        this.waitingInfo = raw_content.waiting_info ?? this.waitingInfo;
        this.contextItemLength = raw_content.context_item_length ?? this.contextItemLength;
        this.loreSearchLength = raw_content.lore_search_length ?? this.loreSearchLength;
        this.APIMaxTryingLimit = raw_content.API_max_trying_limit;
        this.APIKey = raw_content.API_key ?? this.APIKey;
        if(this.APIKey == "")
        {
            logger.warn("API Key is not set,if you are using AIchat functions, please set it in the config file.");
        }
    }
}

// 导出的全局配置单例
export const aiConfig = new AIConfig();