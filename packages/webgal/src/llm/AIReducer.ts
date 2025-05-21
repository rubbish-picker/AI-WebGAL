import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { IAiGeneratedSentence, IAiSentenceState, IAiState, IFinishAiSentencePayload, ISetAiStatePayload } from "./AIInterface";
import cloneDeep from "lodash/cloneDeep";
import { ISentence } from "@/Core/controller/scene/sceneInterface";
import { generateUUID } from "./utils";

export const InitAiState: IAiState = {
    OnGoings: [], // 正在进行的AI对话
    sentenceGenerated: [], // 生成的句子
    uuid: generateUUID(), // 唯一ID
};

const AISlice = createSlice({
    name: 'AI',
    initialState: cloneDeep(InitAiState),
    reducers: {
        /**
         * 设置AI状态
         * @param state 当前状态
         * @param action 替换的状态
         */
        resetAiState: (state, action: PayloadAction<IAiState>) => {
            Object.assign(state, action.payload);
        },

        /**
         * 设置AI状态
         * @param state 当前状态
         * @param action 要替换的键值对
         */
        setAiState: (state, action: PayloadAction<ISetAiStatePayload>) => {
            // @ts-ignore
            state[action.payload.key] = action.payload.value;
        },
        /**
         * 添加AI对话
         * @param state 当前状态
         * @param action 要添加的对话
         */
        addAiSentence: (state, action: PayloadAction<IAiSentenceState>) => {
            state.OnGoings.push(action.payload);
        },

        /**
         * 设置AI对话的加载状态
         * @param state 当前状态
         * @param action 对话ID
         */
        finishAiSentenceByid: (state, action: PayloadAction<IFinishAiSentencePayload>) => {
            const { id, response } = action.payload;
            const index = state.OnGoings.findIndex((item) => item.id === id);
            if (index !== -1) {
                state.OnGoings[index].isLoading = false;
                state.OnGoings[index].response = response;
            }
        },

        /**
         * 通过prompt删除AI对话
         * @param state 当前状态
         * @param action prompt
         */
        removeAiSentenceByPrompt: (state, action: PayloadAction<string>) => {
            state.OnGoings = state.OnGoings.filter((item) => item.prompt !== action.payload);
        },

        /**
         * 通过name删除AI对话
         * @param state 当前状态
         * @param action name
         */
        removeAiSentenceByName: (state, action: PayloadAction<string>) => {
            state.OnGoings = state.OnGoings.filter((item) => item.name !== action.payload);
        },

        /**
         * 通过id删除AI对话
         * @param state 当前状态
         * @param action id
         */
        removeAiSentenceById: (state, action: PayloadAction<string>) => {
            state.OnGoings = state.OnGoings.filter((item) => item.id !== action.payload);
        },

        /**
         * 添加生成的句子
         * @param state 当前状态
         * @param action Isentence 生成的句子
         */
        addGeneratedSentence: (state, action: PayloadAction<ISentence>) => {
            const index = state.sentenceGenerated.length;
            const newSentence: IAiGeneratedSentence = {
                index: index,
                sentence: action.payload,
            };
            state.sentenceGenerated.push(newSentence);
        },

        /**
         * 清除生成的句子
         * @param state 当前状态
         * @param action 句子索引
         */
        removeGeneratedSentence: (state, action: PayloadAction<number>) => {
            const index = action.payload;
            if (index >= 0 && index < state.sentenceGenerated.length) {
                state.sentenceGenerated.splice(index, 1);
            }
        }
    },
});

export const { resetAiState, setAiState, addAiSentence, removeAiSentenceById, addGeneratedSentence, removeGeneratedSentence } = AISlice.actions;
export const AiActions = AISlice.actions;
export default AISlice.reducer;