# 獅子の女王：撃破後の再訪・沐浴イベント

- 撃破フラグがある場合、所持カードや噂の条件によらず金扉を通行可能。新しい迷宮でも解錠選択を出さず開く。未討伐時の条件は変更なし。
- 通常再訪は空の玉座と指定文。Aで入室前のマスへ退室。
- 隠しイベントは入室ごとに Math.random() < 0.0005。Bで退室、Aで導入演出。再戦・再報酬なし。
- 導入：静止1000ms、玉座フェード700ms、暗転300ms、沐浴画像フェード800ms（blur28→22px）、ぼかし解除1700ms（22→0px、scale1.05→1）、静止400ms。計4900ms。
- ぼかし解除はsmoothstepで両端を緩やかに補間。元画像は未加工。
- reduced-motion：フェード200ms、暗転100ms、フェード200ms、静止400ms、計900ms。拡大・ぼかし変化なし。
- 終了フェード1200ms（blur0→28px）、reduced-motionは250ms。
- decode完了前は透明・blur28px。専用レイヤーはdecode後に挿入。進行は既存フレーム更新を利用し、独自タイマーなし。入力ロック、再発生、キャンセル、ロード相当リセットで破棄を確認。
- 水音は既存SEループ管理（音量・ミュート・非表示タブ設定に従う）。開始・停止要求をブラウザテストで確認。
- 実績5件追加。アイテム図鑑は依頼者指定により予約枠（解除不可）。魔物図鑑は既存達成率と同じ通常枠の全討伐。全実績獲得は再計算され未達成に戻る。

検証：全1512件成功。PC1280×900・スマホ390×844・reduced-motionで確認。既存の噂→入室→戦闘→勝利→続きの噂も両幅で回帰確認。
スクリーンショット：artifacts/lion-bath/ 内の empty / black / blur / revealed。

本体変更：data/loewenkoenigin.js、data/adventure-records.js、js/lion-bath.js（新規）、js/lion-event.js、js/player.js、js/main.js、js/renderer.js、js/audio.js、css/style.css。
テスト：tests/lion-bath.test.mjs、tests/browser/lion-bath.mjs（新規）、既存実績・入室テストの期待値更新。
コミット／pushなし。se/README.txtの既存編集は変更していない。
