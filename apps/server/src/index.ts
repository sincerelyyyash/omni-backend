import Express from "express"

const app = Express()
const PORT = process.env.PORT ?? 8000;


app.listen(PORT,()=> {
    console.log("Backend server is running on PORT : " + PORT);
})