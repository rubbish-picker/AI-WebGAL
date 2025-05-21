/* 
 * Modified by [rubbish-picker]
 * Original Copyright (c) [OpenWebGAL]  
 * Licensed under the MIT2.0 License.
 */

import { webgalStore } from '@/store/store';
import { setStage } from '@/store/stageReducer';
import { setVisibility } from '@/store/GUIReducer';
import { stopAllPerform } from '@/Core/controller/gamePlay/stopAllPerform';
import { stopAuto } from '@/Core/controller/gamePlay/autoPlay';
import { stopFast } from '@/Core/controller/gamePlay/fastSkip';
import { setEbg } from '@/Core/gameScripts/changeBg/setEbg';
import { InitAiState, resetAiState } from '@/llm/AIReducer';
import { getNewAiInitState } from '@/llm/utils';

export const backToTitle = () => {
  if (webgalStore.getState().GUI.showTitle) return;
  const dispatch = webgalStore.dispatch;
  stopAllPerform();
  stopAuto();
  stopFast();
  // 重置AI状态
  dispatch(resetAiState(getNewAiInitState())); 
  // 清除语音
  dispatch(setStage({ key: 'playVocal', value: '' }));
  // 重新打开标题界面
  dispatch(setVisibility({ component: 'showTitle', visibility: true }));
  /**
   * 重设为标题背景
   */
  setEbg(webgalStore.getState().GUI.titleBg);
};
