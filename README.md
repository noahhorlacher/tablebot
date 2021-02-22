# ⛔ Work in progress!

# Tablebot Discord Bot

Supports csv and xlsx.

## Use Case

Automation of a goodlooking Tournament/Championship chart generation via a discord bot.

## How to build

1. Clone repo
2. Install dependencies: `npm i`
3. If you're not deploying to heroku, add a .env file at root with the following content:
   `BOT_TOKEN = "your_bot_token"`
   Replace your_bot_token with your actual bot token.
4. Start: `npm start`
5. Stay hydrated 💦

# Overwrite defaults

In `defaults.json`, you can overwrite all default settings.
`template.pug` contains the layout of the table image.
`default.css` contains the styling base (using variables from `vars.css`).
