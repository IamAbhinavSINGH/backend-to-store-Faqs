# Multilingual FAQ API

Hey there, This project is developed by me ^^ as an assignment for the BharatFD backend position. I enjoyed working on this project and I am hoping that you review this project thoroughly. 

This project implements a RESTful API for managing Frequently Asked Questions (FAQs) with multi-language support, caching, and WYSIWYG editor integration. It's built using Node.js, Express.js, Prisma ORM, PostgreSQL, and Redis.

## Assumptions & Decisions 

- I have switched to using GEMINI LLM for translation of FAQs instead of Google Translate API as it is not free and I am out of free trials :(
- I am assuming that you have the GEMINI API KEY and you 
have updated the '.env' file with your api key. 
- I am assuming that you have followed the Installation steps and you are running this project through DOCKER.
- I am assuming that you will be using a tool like POSTMAN to make api calls.

## Application Design
This application uses Postgress database to store all the faqs and then uses redis for caching. Everytime when user calls a translated faq the redis database is checked for caching and if it does not have the translated faq then we check in our db and if it doesnt have it as well then make an api call to gemini to get the translations then we store the translations  in redis and db for future caching purposes and then we return the translated faqs. 

This design results in exponential decreament in time and during my testing, The average response time I get was around only '40ms' although when a translation is not present and the application have to make an api call to gemini then the response time increases at around '2sec' although it is rare to happen.

## Features

- CRUD operations for FAQs
- Multi-language support with automatic translation for all languages
- WYSIWYG editor support for rich text answers
- Caching mechanism using Redis for improved performance
- RESTful API with language selection via query parameter
- Docker support for easy deployment

## Tech Stack

- Node.js & Express.js
- PostgreSQL (Database)
- Prisma (ORM)
- Redis (Caching)
- Gemini API (Translation)

## Prerequisites

- Docker and Docker Compose
- Gemini API key

## Installation and Setup

1. Clone the repository:

```plaintext
    git clone https://github.com/IamAbhinavSINGH/backend-to-store-Faqs

    cd backend-to-store-Faqs
```

2. Create a `.env` file in the project root and add the following:

```plaintext
GEMINI_KEY="your_gemini_api_key_here"

```

3. Build and run the Docker containers:

```plaintext

docker-compose --env-file .env up --build

```

4. The API will be available at `http://localhost:8000/api`.



## API Usage

### Get FAQs


- Fetch FAQs in English (default):

```
    GET -  http://localhost:8000/api/faqs

```

- Fetch FAQs in a specific language:

```
GET - http://localhost:8000/api/faqs?lang=hi

```


### Create FAQ
- Create a multilingual FAQ with question and answer

```plaintext
POST http://localhost:8000/api/faqs

Content-Type: application/json

{
    "question": "What is the meaning of life?",
    "answer": "42"
}

```

### Update FAQ

- You can get the specific id from get requests

```
    PUT - http://localhost:8000/api/faqs/?id=

    Content-Type: application/json

    {
        "question": "Updated question",
        "answer": "Updated answer"
    }

```

### Delete FAQ

- Endpoint to delete a FAQ with all its stored translations as well

```
DELETE - http://localhost:8000/api/faqs/?id=
```

## Model Design

The FAQ model includes:
- `question` (String): The FAQ question
- `answer` (String): The FAQ answer (supports rich text)
- `translations` (Relation): Language-specific translations


## WYSIWYG Editor Integration

The project uses a WYSIWYG editor for formatting answers. The rich text content is stored in the database and served through the API.


## Caching Mechanism

Redis is used to cache FAQ translations, improving response times for repeated queries. The cache is automatically invalidated when FAQs are updated or deleted.


## Multi-language Translation Support

The Gemini API is used for automatic translation of FAQs. Translations are generated when FAQs are created or updated, and stored in the database for quick retrieval.

## Code Quality

This project follows ES6 guidelines and uses ESLint for maintaining code quality. To run the linter: