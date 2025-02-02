import db from "../lib/db";
import axios from 'axios'
import redis from "../lib/redis";

interface FaqType{
    id : string | null,
    question : string,
    answer : string
}

interface AddFaqsPropsType{
    question : string,
    answer : string
}

const CACHE_EXPIRATION = 5 * 60 * 60 ;   // 5 hrs in seconds

export const addFaqsToDB = async (faq : AddFaqsPropsType) => {
    // try adding the faq to db with translated languages
    try{
        const storedFAQ = await db.fAQ.create({
            data : {
                question : faq.question,
                answer : faq.answer
            }
        })

        // pre translate faqs to hindi and bangla 
        await translateFaqToLanguage(storedFAQ , 'hi');
        await translateFaqToLanguage(storedFAQ , 'bn');
        
        return storedFAQ;
    }catch(err){
        console.log("Could not add faq to db : " , err);
        return null
    }
}

export const getFaq = async (faqId : string) => {
    try{
        if(!faqId){
            return null;
        }

        const faq = await db.fAQ.findFirst({ 
            where : { 
                id : faqId
            } ,
            select : {
                id : true,
                question : true,
                answer : true
            }
        });

        return faq;
    }catch(err){
        console.log('error while fetching a faq : ' , err);
    }
}

export const getFaqs = async () => {
    try{
        const faqs = db.fAQ.findMany({ 
            select : {
                id : true,
                question : true,
                answer : true
            }
        });

        return faqs;
    }catch(err){
        console.log("could not fetch faqs : " , err);
    }
}

export const deleteFaq = async (faqId : string) => {
    try{
        if(!faqId){
            return ;
        }

        const faq = await db.fAQ.findFirst({ where : { id : faqId } });
        if(!faq){
            return;
        }

        await db.fAQ.delete({ where : { id : faqId } });

        // delete all the translations associated with that faq
        const translations = await db.translation.findMany({ where : { faqId : faqId } });
        if(translations){
            await db.translation.deleteMany({ where : { faqId : faqId } });
            translations.map(async (languageCode) => {
                await redis.del(`${faqId}_${languageCode}`);
            });
        }

    }catch(err){
        console.log(`error while deleting a faq : ` , err);
    }
}

export const updateFaq = async (faq : FaqType) => {
    try{

        if(!faq.id){
            return;
        }

        const updatedFAQ = await db.fAQ.update({ 
            where : { 
                id : faq.id
            },
            data : {
                question : faq.question,
                answer : faq.answer
            }
        });

        // delete previous translations of this faq and then add new translations
        const translations = await db.translation.findMany({ where : { faqId : updatedFAQ.id } });

        if(translations && translations.length > 0){
            
            await db.translation.deleteMany({ where : { faqId : updatedFAQ.id } });
            translations.map(async (languageCode) => {
                await redis.del(`${updatedFAQ.id}_${languageCode}`);
            });
            
        }

        await translateFaqToLanguage(updatedFAQ , 'hi');
        await translateFaqToLanguage(updatedFAQ , 'bn');

    }catch(err){
        console.log("Error while updating faq : " , err);
    }
}

export const getTranslatedFaqs = async (languageCode : string) => {
    try{
        const faqs = await db.fAQ.findMany({});
        
        const translatedFaqs = await Promise.all(
            faqs.map((faq) => getTranslatedFaq(faq.id , languageCode))
        );

        return translatedFaqs
    }catch(err){
        console.log("could not get the list of translated faqs : " , err);
    }
}

// returns a translated FAQ and if the translation isn't present then fallbacks to the original FAQ
export const getTranslatedFaq = async (faqid : string , languageCode : string) => {
    let originalFAQ = null;

    try{

        const cacheKey = `${faqid}_${languageCode}`
        const cachedFAQ = await redis.get(cacheKey);

        if(cachedFAQ){
            console.log("redis cache hit");
            const parsedFAQ = JSON.parse(cachedFAQ);
            return {
                id : parsedFAQ.faqId as string,
                question : parsedFAQ.question as string,
                answer : parsedFAQ.answer as string,
            }
        }

        console.log("redis cache miss");

        const translatedFAQ = await db.translation.findFirst({
            where : { faqId : faqid , languageCode : languageCode} , 
        })

        if(translatedFAQ){
            console.log("db cache hit");

            await redis.setex(cacheKey , CACHE_EXPIRATION , JSON.stringify(translatedFAQ));
            return {
                id : translatedFAQ.faqId,
                question : translatedFAQ.question,
                answer : translatedFAQ.answer
            }
        }

        console.log("db cache also miss");

        originalFAQ = await db.fAQ.findFirst({ where : { id : faqid } });

        if(!originalFAQ){ 
            return null;
        }

        const newTranslatedFAQ = await translateFaqToLanguage(originalFAQ , languageCode);
        if(!newTranslatedFAQ) throw new Error();
        
        return {
            id : newTranslatedFAQ.faqId,
            queston : newTranslatedFAQ.question,
            answer : newTranslatedFAQ.answer
        }

    }catch(err){
        console.log("Couldn't translate FAQ : " , err);

        if(originalFAQ){ 
            return {
                id : originalFAQ.id,
                queston : originalFAQ.question,
                answer : originalFAQ.answer
            }
        }
        throw err;
    }
}

export const translateFaqToLanguage = async (faq : FaqType , languageCode : string) => {

    try{
        const cacheKey =`${faq.id}_${languageCode}`;
        const translatedFAQ = await getTranslation(faq , languageCode);
        
        if(!translatedFAQ || !translatedFAQ.question || !translatedFAQ.answer) {
            return null;
        }

        const storedFAQ = await db.translation.create({
            data : {
                faqId : faq.id!,
                languageCode : languageCode,
                question : translatedFAQ.question,
                answer : translatedFAQ.answer
            }
        });

        console.log("translation stored on redis");
        await redis.setex(cacheKey , CACHE_EXPIRATION , JSON.stringify(storedFAQ));

        return storedFAQ;
    }catch(err){
        console.log("error while translating faq : " , err);
        return null;
    }
}

export const getTranslation = async(faq : FaqType , languageCode : string) => {
    const apiKey = process.env.GEMINI_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
                    You need to translate some text to a different language, I will give you a question and an answer and you need to convert
                    the question and answer to another language remember you aren't supposed to do anything else except changing the language,
                    the text can be of form plain text or HTML markup language and in case of html don't change the html strucutre just 
                    translate the content inside html and also make sure that you only return the translated text nothing else and in case of
                    HTML you shld only return the HTML strutucre with translated content. Do not add anything else except the already present
                    markup language and the translated text not even special characters for richText, The languageCode in which you have
                    to convert the text is '${languageCode}' The question which you have to convert is '${faq.question}' , The answer which you have to convert is
                    '${faq.answer}' You need to return the translated question first followed by a semicolon and then the answer thats it

                    `

    // regular expression to remove all occurances of '/n'
    const enhancedPrompt = prompt.replace(/\n/g, "");

    try{
        const response = await axios.post(apiUrl , {
            contents : [
                {
                    parts : [{ text : enhancedPrompt }]
                }
            ]
        });

        if (response.data.candidates && response.data.candidates.length > 0) {
            const result = response.data.candidates[0].content.parts[0].text as string; // Extract translated text
            const ans = result.split(";");

            return {
                question : ans[0],
                answer : ans[1]
            }

        } else {
            throw new Error("Translation failed!");
        }
    }catch(err){
        console.log("error while translating with gemini : " , err);
        return null;
    }
}