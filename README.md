# Synera

As college kids, one of the problems we faced were finding people to connect 
We wanted to aid people who need help understanding a subject, want to teach a skill, collaborate with others or simply find someone with the same hobby. This is why we made Synera!

Synera connects people with others who want to learn, study, teach or collaborate. Users can find people nearby to work with based on their interests and skills, and whether they want to find a study partner, get tutoring, swap skills, work on projects or try out a hobby together.

On Synera people can create a profile for themselves and then add their skills and interests. After that, you can find people that share your interests and skills and connect with them. Once you have a chat with them and you both agree to meetup, you can schedule a meetup at any of the locations found on the map on our website where you can find a comfortable environment to learn and collaborate.

> Current scope: This demo focuses on skill swapping. Study buddy and hobby help are planned expansions.

## Features

- SkillSwap Profiles: You can list the skills you can teach and the skills you want to learn.
- Personalized Matches: You can browse registered users whose skills complement yours.
- Chat with your match: You can message the people you have matched with.
- Meetup Proposals: You can propose a time and place in chat, however, the other person must accept before anything is scheduled.
- Meetup map: You can pick from public locations shown on the map, view reviews and rate the spots you have visited.
- AI Swap Helper (Gemini): You can generate flashcards, icebreakers, mini-lessons, and other activities to run your skill-swap session.
- Secure Accounts: Username/password sign-up with hashed passwords, plus optional Google sign-in.

## How We Built It

Frontend: React 19, JSX, and custom CSS
We built the interface as a React 19 single-page app using JSX and custom CSS. Different features, like profiles, matching, chat, meetups, maps, and the AI helper, are separate components. We used custom CSS to create our Frutiger Aero design.

Build and tooling: Vite and ESLint
We used Vite for fast development and production builds. ESLint helped us catch errors and keep our code consistent while working as a team.

Backend: Node.js 24+ with a custom HTTP server
Instead of a large framework, we wrote our own HTTP server and API handlers in Node.js. It handles sign-up and login, profiles, matching, chat, meetup proposals and acceptance, Google OAuth callbacks, and the /api/study-helper endpoint for Gemini. Because the logic lives in plain handlers, the same code runs in two places: the local server during development and Vercel's serverless function in production. Node 24+ is required because we use its built-in SQLite module.

Data and authentication: SQLite, scrypt, and Google OAuth
We use SQLite to store account and app data. Passwords are protected using scrypt, and users can also log in with Google OAuth. Our passwords and API keys are never stored in the browser.

Maps: Leaflet and OpenStreetMap
Our meetup map uses Leaflet and OpenStreetMap. Users can choose public locations when planning meetups.

AI: Google Gemini
Our AI helper uses Google Gemini to create flashcards, icebreakers, and mini-lessons. The API key stays on the server for security.

Hosting: Vercel
We use Vercel to host our app and handle our API requests. Since our demo uses temporary storage, a full production version would need a permanent database.

## Challenges We Faced
- One of our biggest challenges was setting up user authentication and figuring out how to manage user accounts securely. We had to work through password protection, Google login, and making sure users could sign up and log in properly. Getting all these features to work together took time and troubleshooting.

- Another thing that we struggled with was setting up the pinpoints on the map, so that it showed the user study or work spots within the area of the user and their connection. Setting this up also took a lot of time and troubleshooting.

## Accomplishments that we're proud of

We are proud that we were abled to take an idea and turn it into a working prototype in a short amount of time. We are also incredibly proud of how our interface is both visually appealing and easy to navigate.

## What's next for Synera

Our next plans for Synera are expanding our Study Buddy and Hobby Helper features to create more opportunities for users to connect with others over shared interests, exchange skills and explore new interests.

- Study Buddy: Matches you to people who want to study the same subject or course as you. Through this you can find study partners, get help for tutors or you can tutor others.

- Hobby Help: Matches you to someone who you can try or help with a new hobby or activity with. Through this you can find people who have the same interests as you do.

## How To Run The Project

Sign up with a username and password, or with Google.
Build your profile with the skills you can offer and the ones you want to learn.
Browse matches from registered accounts, ranked by how well their skills complement yours.
Start a chat with a match (chat is match-only).
Propose a meetup at a location from the map; the other participant accepts or declines.
Swap skills in person, using the AI helper for flashcards, icebreakers, and mini-lessons.
