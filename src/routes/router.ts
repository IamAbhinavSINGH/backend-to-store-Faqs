import express , { Request , Response } from "express";
import z from 'zod';
import { addFaqsToDB, deleteFaq, getFaq, getFaqs, getTranslatedFaq, getTranslatedFaqs, updateFaq } from '../controllers/index';

const router = express.Router();

const faqSchema = z.object({
    question : z.string(),
    answer : z.string()
})


router.get('/faqs' , async (req : Request , res : Response) => {
    try{
        const { lang } = req.query;
        const languageCode = lang as string;
        let faqs = null;

        if(!languageCode || languageCode.length == 0){
            faqs = await getFaqs();
        }
        else {
            faqs = await getTranslatedFaqs(languageCode);
        }

        if(!faqs){
            res.status(400).json({
                message : "Could not fetch faqs!!!"
            });
            return;
        }

        res.json({
            faqs : faqs
        });

    }catch(err){
        console.log("An error occured while fetching faqs : " , err);
        res.status(400).json({
            message : "An error occured while fetching faqs"
        });
    }

});

router.get('/faq' , async (req : Request , res : Response) => {
    try{
        const { id , lang } = req.query;
        const faqId = id as string
        const languageCode = lang as string;

        let faq = null;

        if(!languageCode){
            faq = await getFaq(faqId);
        }
        else {
            faq = await getTranslatedFaq(faqId , languageCode);
        }
        
        if(!faq){
            res.status(400).json({
                message : "FAQ don't exist!!"
            });
            return;
        }

        res.json({
            faq : faq
        });

    }catch(err){
        console.log("Error while handling faq get request : " , err);
        res.status(400).json({
            message : "An error occured!!"
        });
    }
});

// Post request to store faqs in db , expects faqs in req body as JSON
router.post('/faqs' , async (req : Request , res : Response) => {
    
    try{
        const parsedSchema = faqSchema.safeParse(req.body);
    
        if(!parsedSchema.success){
            res.status(422).json({
                message : "Invalid inputs!!!"
            });
            return;
        }

        const faq = await addFaqsToDB(parsedSchema.data)

        if(!faq){
            res.status(400).json({
                message : "An error occured while storing faq!!"
            })
            return;
        }

        res.json({
            message : "FAQ added successfully!!!",
            faq : faq
        });

    }catch(err){
        console.log("An error occured while storing faq : " , err);
        res.status(400).json({
            message : "An error occured while storing faqs!!"
        });
    }
    
});

router.delete('/faq' , async (req : Request , res : Response) => {
    try{
        const { id } = req.query;
        const faqId = id as string;

        if(!faqId){
            res.status(422).json({
                message : "No id found to delete"
            });
        }

        await deleteFaq(faqId);

        res.json({
            message : "Successfully deleted FAQ"
        });
    }catch(err){
        console.log("Error in handling delete request : " , err);
        res.status(400).json({
            message : "An error occured!!"
        });
    }
});

router.put('/faq' , async (req : Request , res : Response) => {
    try{    
        const { id } = req.query;
        const faqId = id as string;
        const parsedSchema = faqSchema.safeParse(req.body);

        if(!parsedSchema.success){
            res.status(422).json({
                message : "Invalid inputs!!!"
            });
            return;
        }

        const faqToUpdate = {
            id : faqId,
            question : parsedSchema.data.question,
            answer : parsedSchema.data.answer
        }

        await updateFaq(faqToUpdate);

        res.json({
            message : "Faq updated succesfully!!"
        })

    }catch(err){
        console.log("Error while handling put request : " , err);
        res.status(400).json({
            message : "An error occured!!"
        });
    }
});

export default router;