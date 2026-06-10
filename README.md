# Geolonia PWAマップ

## Geolonia PWAマップ について

Geolonia PWA は、GitHub と Google Sheets を使って、素早く PWA の地図アプリが作れるテンプレートです。

利用方法はこちらのマニュアルをご覧ください。

[Geolonia PWA マップ ユーザーマニュアル](https://blog.geolonia.com/2022/05/17/pwamap-manual-setup.html)

## 注意事項
このプログラムは自由にカスタマイズ可能ですが、利用についてはサポート対象外となります。

## 釣りゲーム

ブラウザで遊べるリアル海釣りシミュレーター「FISHMAP 釣りゲーム」を同梱しています。
ライブラリ依存なし（HTML5 Canvas + Web Audio）の静的ファイルのみで動作します。

- 開発サーバー起動後: `http://localhost:3000/fishing-game/`
- 公開サイトでは: `https://<あなたのサイト>/fishing-game/`

### 遊び方

1. 画面を長押しでパワーをため、離してキャスト（遠投するほど深場の魚が狙える）
2. ウキが大きく沈んだ瞬間にタップしてアワセ（早アワセすると魚に逃げられる）
3. ファイト中は押している間リールを巻く。テンションゲージが赤に入るとラインブレイクするので、魚が走ったら手を離して耐える
4. 時間帯（昼夜）で釣れる魚が変わる。全15種の図鑑コンプリートを目指そう

釣果・スコア・図鑑はブラウザの localStorage に保存されます。
ソースは `public/fishing-game/` 配下（`index.html` / `style.css` / `game.js`）です。

## 開発

[Geolonia PWA マップ ユーザーマニュアル](https://blog.geolonia.com/2022/05/17/pwamap-manual-setup.html) の手順を実行、その後以下のコマンドを実行して下さい。

```shell
$ git clone git@github.com:geoloniamaps/pwa.git
$ cd pwa
$ npm install
$ npm start
```

下の URL にアクセスして下さい。開発サーバーが立ち上がります。

`http://localhost:3000/<あなたのリポジトリ名>/#/`

## データの更新

Geolonia PWA では、GitHub Actions を利用して、定期的に Google Sheets のデータをダウンロードしています。
ローカル環境で開発時にデータの更新をする際は、`git pull origin master` を実行して最新のデータをダウンロードして下さい。

- GitHub Actions は10分毎のスケジュールですが、GitHub の仕様により大幅に遅れる可能性があります。
- リポジトリが60日間使用されないと、GitHub Actions は自動的に無効になります。ご注意ください。

## GitHub の通知メールの設定について
- GitHub Actions 実行時に通知メールを送信します。通知メールを受け取りたく無い場合は、[GitHub Actions の通知オプション](https://docs.github.com/ja/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/configuring-notifications#github-actions-%E3%81%AE%E9%80%9A%E7%9F%A5%E3%82%AA%E3%83%97%E3%82%B7%E3%83%A7%E3%83%B3) を参考に GitHub の通知設定を変更してください。
