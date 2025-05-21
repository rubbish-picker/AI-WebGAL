import { logger } from "@/Core/util/logger";

// 定义Live2D功能特征接口
export interface AILive2DFeature {
    motion: string;         // 动作资源标识
    expression: string;     // 表情资源标识
    path: string;           // 资源文件路径（可选覆盖路径）
}

// 定义Live2D触发器接口
export interface AILive2DTrigger {
    key: string;            // 触发条件键值
    values: AILive2DFeature[]; // 关联的特征集合
}

// 定义Live2D角色配置接口
export interface AILive2DCharacter {
    speaker: string;        // 角色标识符（与语音角色关联）
    defaultPath: string;    // 默认资源根路径
    referTable: AILive2DTrigger[]; // 触发器配置表
    expKeys: string;        // 所有触发键的逗号分隔字符串
}

// Live2D角色管理表
export class AILive2DCharacterTable {
    // 存储所有角色配置
    public characters: AILive2DCharacter[] = [];

    /**
     * 初始化角色配置表
     * @param raw_content - 包含figure_table字段的原始配置数据
     */
    public initial(raw_content: any) {
        // 配置存在性检查
        if (!raw_content.figure_table) {
            logger.warn("Missing figure_table in controls.json");
            return;
        }
        // 遍历添加角色配置
        for (let chara of raw_content.figure_table) {
            characterTable.addCharacter(chara);
        }
    }

    /**
     * 根据角色名和触发键获取特征集合
     * @param speaker - 角色标识（自动过滤非字符串类型）
     * @param targetKey - 目标触发键
     * @param strict - 匹配模式
     *                 true: 精确匹配key
     *                 false: 包含匹配（默认）
     * @returns Live2DFeature[] | null
     */
    public getExpByNameAndKey(
        speaker: string | null | number | boolean,
        targetKey: string,
        strict: boolean = false
    ) {
        // 类型安全检查
        if (typeof speaker !== "string") {
            logger.error("Invalid speaker dataType!");
            return null;
        }
        // 获取角色配置
        const chara = this.getCharacterByName(speaker, strict);
        if (chara === null) {
            logger.warn("Unable to find target SpeakerName",speaker);
            return null;
        }
        // 遍历触发器查找匹配项
        for (let trigger of chara.referTable) {
            if (strict ? trigger.key === targetKey : targetKey.includes(trigger.key)) {
                // logger.debug("Ai-provided key found for exp", trigger);
                return trigger.values;
            }
        }
        logger.warn("Unable to find target SpeakerName&TargetKey",{speaker:speaker, targetKey: targetKey});
        return null;
    }

    /**
     * 根据角色名获取角色配置
     * @param speaker - 角色标识
     * @param strict - 是否严格匹配角色名
     */
    public getCharacterByName(
        speaker: string | number | boolean | null,
        strict: boolean = false
    ) {
        // 输入类型过滤
        if (typeof speaker !== "string") {
            logger.error("Invalid speaker dataType!");
            return null;
        }
        // 遍历查找角色
        for (let chara of this.characters) {
            if (strict ? chara.speaker === speaker : speaker.includes(chara.speaker)) {
                // logger.debug("Target Speaker got", speaker);
                return chara;
            }
        }
        logger.warn("Unable to find target SpeakerKey", speaker);
        return null;
    }

    /**
     * 添加新角色配置
     * @param jsonText - 原始角色配置对象
     */
    public addCharacter(jsonText: any) {
        // 构建新角色对象
        const newChara: AILive2DCharacter = {
            speaker: jsonText.speaker,
            defaultPath: jsonText.default_live2d_path,
            referTable: this.getReferTable(jsonText),
            expKeys: "",
        };
        // 生成调试用键值字符串
        const keys = [];
        for (let trigger of newChara.referTable) {
            keys.push(trigger.key);
        }
        newChara.expKeys = keys.join(",");
        // 空键值警告
        if (newChara.expKeys === "") {
            logger.warn("Character added with no expkeys. Are you sure it has an accurate referTable?");
        }
        this.characters.push(newChara);
        logger.info("New AIcharacter config added", newChara);
    }

    /**
     * 解析引用表配置（私有方法）
     * @param jsonText - 原始角色配置对象
     * @returns 结构化触发器数组
     */
    private getReferTable(jsonText: any) {
        const newReferTable: AILive2DTrigger[] = [];
        // 遍历原始配置键值
        for (const reKey in jsonText.refer_table) {
            const newtrigger: AILive2DTrigger = {
                key: reKey,
                values: this.getLive2DFeatures(jsonText.refer_table[reKey]),
            };
            newReferTable.push(newtrigger);
        }
        // 空表警告
        if (newReferTable.length === 0) {
            logger.warn("Character's ReferTable Parsed turns out empty");
        }
        return newReferTable;
    }

    /**
     * 解析特征配置（私有方法）
     * @param subJsonText - 特征配置数组
     * @returns 结构化特征数组
     */
    private getLive2DFeatures(subJsonText: any) {
        const features: AILive2DFeature[] = [];
        // 遍历特征配置项
        for (const featureItem of subJsonText) {
            const newFeature: AILive2DFeature = {
                motion: featureItem.motion,
                expression: featureItem.expression,
                path: "", // 默认使用角色默认配置路径
            };
            // 允许特征路径覆盖
            if (featureItem.hasOwnProperty("path")) {
                newFeature.path = featureItem.path;
            }
            else {
                // logger.debug("AILive2D specific path not exist, using default instead...");
            }
            features.push(newFeature);
        }
        return features;
    }
}

// 导出全局单例实例
export const characterTable = new AILive2DCharacterTable();