import { logger } from "@/Core/util/logger";
import { GeneralKeyValueInterface } from "./utils";

// 背景表管理类，用于管理通用键值对形式的AI背景查找配置
export class AIBackgroundTable {
    // 存储背景配置的键值对数组
    public bgs: GeneralKeyValueInterface[] = [];

    /**
     * 初始化背景表，处理原始配置数据
     * @param raw_content - 包含bg_table字段的原始配置对象
     */
    public initial(raw_content: any) {
        // 检查是否存在bg_table配置
        if (!raw_content.bg_table) {
            logger.warn("Missing bg_table in controls.json");
            return;
        }

        // 遍历并添加所有ai背景配置
        for (let bg of raw_content.bg_table) {
            this.addBackground(bg);
        }
    }

    /**
     * 添加单个背景配置项
     * @param jsonText - 包含key/value属性的背景配置对象
     */
    public addBackground(jsonText: any) {
        let newBg: GeneralKeyValueInterface = {
            key: jsonText.key ?? "",
            value: jsonText.value ?? ""
        }
        if (newBg.key == "" || newBg.value == "") {
            logger.warn("Empty bg key or value", jsonText);
        }
        this.bgs.push(newBg);
        logger.info("Bg AIConfig Added", newBg);
    }

    /**
     * 根据目标键获取背景值
     * @param targetKey - 要查找的目标键
     * @param strict - 是否启用严格模式（默认false）
     *                 严格模式：精确匹配key
     *                 非严格模式：检查targetKey是否包含key
     * @returns 匹配的背景值，未找到时返回null
     */
    public getBg(targetKey: string, strict: boolean = false) {
        for (let bg of this.bgs) {
            if (!strict) {
                // 非严格模式：使用包含匹配逻辑
                if (targetKey.includes(bg.key) && bg.value != "") {
                    // logger.debug("Target bg got",targetKey);
                    return bg.value;
                }
            } else {
                // 严格模式：需要完全相等
                if (bg.key === targetKey && bg.value != "") {
                    // logger.debug("Target bg got",targetKey);
                    return bg.value;
                }
            }
        }
        logger.warn("Unable to find target BgKey or value is empty", targetKey);
        return null;
    }
}

// 导出的背景表单例实例，全局使用
export const backgroundTable = new AIBackgroundTable();