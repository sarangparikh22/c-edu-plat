const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcrypt-nodejs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const walletGeneration = require('./walletGeneration');

const dbUrl = "mongodb://sarup:sarup123@ds143614.mlab.com:43614/sarup";
const app = express();


app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Authorization, Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/',(req,res)=>{
    res.end({text: "Working"});
})

app.post('/register',(req,res)=>{
    if(req.body.username && req.body.password){
        bcrypt.hash(req.body.password, null, null, function(err, hash) {
            
            // Database Contact
            MongoClient.connect(dbUrl, function(err, db) {
                if (err) throw err;
                var dbo = db.db("sarup");
                // Checking for Unique Username
                dbo.collection("users").find({username: req.body.username}).toArray(function(err, result) {
                    if (err) throw err;
                    try{
                    if(result.length > 0){
                        res.json({message: `Username ${req.body.username} already exsists.`});
                    }else{  
                            // Creating Wallet
                            const wallet = walletGeneration.createWallet(req.body.password);
                            // Creating Username
                            const user = {
                                username: req.body.username,
                                password: hash,
                                wallet: wallet
                            }
                            dbo.collection("users").insertOne(user, function(err, res) {
                                if (err) throw err;
                            });
                        res.json({message: "User Created"});
                        

                    }
                    }catch(e){
                        res.json(e);
                    }
                    db.close();
                });
            });

        });
    }
})

app.post('/login', (req,res) =>{
    if(req.body.username && req.body.password){
        MongoClient.connect(dbUrl, function(err, db) {
            if (err) throw err;
            var dbo = db.db("sarup");
            dbo.collection("users").find({username: req.body.username}).toArray(function(err, result) {
                if (err) throw err;
                try{
                    if(req.body.username === result[0].username && bcrypt.compareSync(req.body.password, result[0].password)){
                        const user = {
                            username: result[0].username,
                            wallet: result[0].wallet
                        }
                        jwt.sign({ user }, 'someshitkey', (err,token) => {
                            res.send({token});
                        })
                    }else{
                        res.json({message: 'Username or Password Incorrect'})
                    }
                }catch(e){
                    res.json({message: 'User not Found'})
                }
                db.close();
              });
        });
    }
})

app.get('/home', verifyToken, (req, res) => {
    jwt.verify(req.token, 'someshitkey', (err, authData) => {
        if(err){
            res.sendStatus(403);
        }else{
            res.json({username: authData.user.username, wallet: authData.user.wallet});
            //res.send(`Welcome ${authData.user.username } <br> Wallet: ${JSON.stringify(authData.user.wallet)}`);
        }
    })
})


function verifyToken(req,res,next) {
    const bearerHeader = req.headers['authorization'];
    if(typeof bearerHeader !== 'undefined'){
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        req.token = bearerToken;
        next();
    }else{
        res.sendStatus(403);
    }
}

app.listen(5000,()=>{
    console.log(`Node Server Started at Port ${5000}`)
})