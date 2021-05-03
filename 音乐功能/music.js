import store from "@/store/index.js"
import {
	musicObjLists
} from "@/utils/base.js";
class MusicAction {
	constructor() {
		// 第一次调用的时候执行
		this.canBgPlay = uni.getStorageSync("bgMusic") == "undefined" || uni.getStorageSync("bgMusic") === "" ? "1" : uni.getStorageSync(
			"bgMusic"); // 背景音乐播放权限
		this.canActPlay = uni.getStorageSync("actMusic") === "undefined" || uni.getStorageSync("actMusic") === "" ? "1" :
			uni.getStorageSync("actMusic"); // 操作音效播放权限
		// 目前发现只有微信小程序有音频混播功能
		// #ifdef MP-WEIXIN
			this.canPlayMore(); // 打开音频混播
		// #endif
	}

	// 初始化
	init() {
		// 基础库 1.6.0 开始支持, 返回音频实例
		if (uni.createInnerAudioContext) {
			musicObjLists.forEach(v => {
				v.obj = uni.createInnerAudioContext();
				v.obj.src = v.src;
				v.obj.autoplay = v.autoplay;
				v.obj.loop = v.loop;
			})
			// 监听音频播放错误事件
			// v.onError((res) => {
			//     console.log("音频播放错误事件", v, res.errMsg)
			// })
			// 不支持的友好提示，版本过低不兼容处理
		} else {
			// #ifndef H5
				uni.showModal({
					title: "提示",
					content: "当前版本过低，无法播放音乐，请升级到最新版本后重试。"
				})
			// #endif
		}
	}

	// 是否与其他音频混播
	canPlayMore() {
		if (uni.setInnerAudioOption) {
			uni.setInnerAudioOption({
				mixWithOther: true, //是否与其他音频混播，设置为 true 之后，不会终止其他应用或微信内的音乐
				obeyMuteSwitch: true, //（仅在 iOS 生效）是否遵循静音开关，设置为 false 之后，即使是在静音模式下，也能播放声音
				success: function(e) {
					// console.log("可以同时播放", e)
				},
				fail: function(e) {
					// console.log("不可以同时播放", e)
				}
			})
		} else {
			// #ifndef H5
			uni.showModal({
				title: "提示-无法其他音频混播",
				content: "当前版本过低，无法使用该功能，请升级到最新版本后重试。"
			})
			// #endif
		}
	}

	/*
	 *@obj-------当前实例
	 *@type------音频类型 bgMusic:背景音乐， actMusic:操作音效
	 */
	// 播放指定音频 
	playMusic({
		name,
		type = "bgMusic"
	}) {
		let nowObj = musicObjLists.find(val => val.name === name);
        switch (type){
            case "bgMusic":
                (this.canBgPlay == "1") && (nowObj.obj.play());
                break;
            case "actMusic":
                (this.canActPlay == "1") && (nowObj.obj.play());
                break;
        }
    }

    // 暂停指定音频
    pauseMusic({name}) {
        let nowObj = musicObjLists.find(val => val.name === name);
        nowObj.obj.pause();
    }

    // 停止指定音频
    stopMusic({name}) {
        let nowObj = musicObjLists.find(val => val.name === name);
        nowObj.obj.stop();
    }

    // 销毁指定音频
    destroyMusic({name}){
        let nowObj = musicObjLists.find(val => val.name === name);
        nowObj.obj.destroy();
    }


}

export default MusicAction;
