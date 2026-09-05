# Шрифты первой версии

Восстановлены по `1. facade-puzzle-game-concept/src/index.css` и `index.html`.

- **AdvakenSans-Expanded** — тот же WOFF2, который был указан в первой версии: https://static.tildacdn.com/tild3263-6664-4563-a238-353561323362/advakensans-expanded.woff2
- **Inter Tight**, 400 / 500 / 600 — Google Fonts: https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300..700&display=swap. Начертания получены с fonts.gstatic.com. Лицензия Inter Tight приложена в `Inter-Tight-OFL.txt`.

В production Vite встраивает файлы шрифтов в HTML. Экспортируемая SVG-карточка также содержит шрифты внутри. Для проверки фактического рендеринга кириллицы использовался Chrome DevTools `CSS.getPlatformFontsForNode`: Advaken Sans Exp, custom font.
