import { logger } from "@/Core/util/logger";
import { GeneralKeyValueInterface } from "./utils";

/**
 * BGM配置管理类
 * AI控制音乐的键值对配置
 */
export class BgmTable {
    // 存储所有BGM配置的键值对数组
    public bgms: GeneralKeyValueInterface[] = [];

    /**
     * 初始化AI控制BGM配置表
     * @param raw_content - 原始配置文件对象
     * 要求包含bgm_table数组字段
     */
    public initial(raw_content: any) {
        // 配置存在性检查
        if (!raw_content.bgm_table) {
            logger.warn("Missing bgm_table in controls.json");
            return;
        }

        // 遍历加载所有BGM配置项
        for (let bgm of raw_content.bgm_table) {
            this.addBgm(bgm);
        }
    }

    /**
     * 添加单个BGM配置项
     * @param jsonText - 包含key/value的配置对象
     * 示例：{ key: "战斗", value: "battle.mp3" }
     */
    public addBgm(jsonText: any) {
        const newBgm: GeneralKeyValueInterface = {
            key: jsonText.key,
            value: jsonText.value
        }
        this.bgms.push(newBgm);
        logger.info("Bgm AIConfig Added", newBgm);
    }

    /**
     * 根据键获取BGM资源路径
     * @param targetKey - 目标键值（支持模糊匹配）
     * @param strict - 匹配模式
     *                true: 精确匹配key
     *                false: 包含匹配（默认）
     * @returns 匹配的BGM路径 | null
     */
    public getBgm(targetKey: string, strict: boolean = false) {
        // 遍历查找首个有效匹配项
        for (let bgm of this.bgms) {
            const isMatch = strict ?
                bgm.key === targetKey :
                targetKey.includes(bgm.key);

            if (isMatch && bgm.value !== "") {
                // logger.debug("Target bgm got",targetKey);
                return bgm.value;
            }
        }
        logger.warn("Unable to find target BgmKey or value is empty", targetKey);
        return null; // 无匹配项时返回null
    }
}

/**
 * 导出的BGM表单例实例
 * 全局唯一，通过bgmTable访问
 */
export const bgmTable = new BgmTable();