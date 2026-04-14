const express = require("express");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');



const router = express.Router();

router.get('/',(req,res) => {
    res.send("Auth route working");
});

//Create db for Registration
router.post('/register', async(req,res)=>{
    try{
        const {username,email,password,college,role} = req.body;
        
           let user = await User.findOne({email});
            if(user) return res.status(400).json({msg: "User already exists"});
    
            const hashedPassword = await bcrypt.hash(password,10);
        
        user = new User({
            username,
            email,
            password: hashedPassword,
            college,
            role
        });

        await user.save();

        res.json({msg: "Registration Successful"});
    }catch(error){
       // console.error(error);
        res.status(500).json({error: error.message});
    }
    });

//Create db for Login
router.post('/login', async (req,res)=>{
    try{
        const {email,password} = req.body;

        const user = await User.findOne({email});
        if(!user) return res.status(400).json({msg: "Invalid Credentials"});
    
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) return res.status(400).json({msg: "Invalid Credentials"});
    
        const token = jwt.sign(
            { id: user._id, role: user.role},
            "secretkey",
            process.env.JWT_SECRET,
            {expiresIn: "24h"}
            
            
        );
        res.json({token,user});
       }catch (error){
        res.status(500).json({error: error.message});
       }
});


module.exports = router;