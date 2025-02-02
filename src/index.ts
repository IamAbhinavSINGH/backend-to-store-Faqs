import express , { Request , Response } from 'express'
import dotenv from 'dotenv';
import router from './routes/router';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());

app.use('/api' , router);

app.get('/' , (req : Request , res : Response) => {
    res.json({
        message : "Server is running just fine!!"
    });
});


app.listen(port , () => {
    console.log(`Server started listening on ${port}...`);
})

