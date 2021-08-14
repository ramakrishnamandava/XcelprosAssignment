const express=require("express");
const jwt=require("jsonwebtoken");
const path=require("path");
const {open}=require("sqlite");
const sqlite3=require("sqlite3");
const bcrypt=require("bcrypt");
const app=express();
const dbPath=path.join(__dirname,"demo.db");
app.use(express.json());

let db=null;

const initializeDBAndServer=async()=>{
    try{
        db=await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });
        app.listen(3000,()=>{
            console.log("Server Running at http://localhost:3000/");
        })
    }catch(e){
        console.log(`DBError: ${e.message}`);
        process.exit(1);
    }
};

initializeDBAndServer();

//API 1

app.post("/userSignup",async(request,response)=>{
    const {Name, Email, Password, Age, Gender, Company, Designation, about}=request.body;
    const isUserExisted=`SELECT * FROM user WHERE Name='${Name}';`;
    const isEmailExisted=`SELECT * FROM user WHERE Email='${Email}';`;
    const dbUser=await db.get(isUserExisted);
    const dbEmail=await db.get(isEmailExisted);
    const passwordVerify=Password.match(/[A-Z]/g) && Password.match(/[^a-zA-Z\d]/g) && Password.length>=8;
    const emailVerify=Email.match(/\S+@\S+\.\S+/);
    if (dbUser!==undefined || dbEmail!==undefined){
        response.status(400);
        response.send("User already exits");
    }else if (Name===undefined || Name===''){
         response.status(400);
         response.send("Enter the Name");
    }else if (passwordVerify===null){
        response.status(400);
        response.send("Password should have 1 uppercase letter, 1 special character and minimum 8 digit password");
    }else if (emailVerify===null){
        response.status(400);
        response.send("Enter valid Email id");
    }else{
        const hashedPassword=await bcrypt.hash(Password,10);
        const registerUserQuery=`INSERT INTO user (Name, Email, Password, Age, Gender, Company, Designation, about) VALUES('${Name}','${Email}','${hashedPassword}','${Age}','${Gender}','${Company}','${Designation}','${about}');`;
        await db.run(registerUserQuery);
        response.status(200);
        response.send("User created Successfully.");
    }
});

//API 2

app.post("/userLogin",async (request,response)=>{
   const {Email,Password}=request.body;
   const isUserExisted=`SELECT * FROM user WHERE Email='${Email}';`;
   const dbUser=await db.get(isUserExisted);
   if (dbUser===undefined){
      response.status(400);
      response.send("Invalid User");
   }else{
    const isPasswordMatched=await bcrypt.compare(Password,dbUser.Password);
    if (isPasswordMatched===true){
        const payload={
            username: Email,
        };
        const jwtToken=jwt.sign(payload,"My_secret_Token");
        response.send({jwtToken})
    }else{
        response.status(400);
        response.send("Invalid Password");
    }
   }
});

//API 3

app.get("/getAllUsers/", async(request,response)=>{
    let jwtToken;
    const authHeader=request.headers["authorization"];
    if (authHeader!==undefined){
        jwtToken=authHeader.split(" ")[1];
    }
    if (jwtToken===undefined){
        response.status(401);
        response.send("Invalid Access Token");
    }else{
        jwt.verify(jwtToken,"My_secret_Token",async(error,payload)=>{
           if (error){
               response.send("Invalid Access Token");
           }else{
               const getAllUsersQuery=`SELECT Name,Email FROM user`;
               const usersArray=await db.all(getAllUsersQuery);
               response.send(usersArray);
           }
        });
    }
});

//API 4

app.get("/getUserById/:id/",async (request,response)=>{
    let jwtToken;
    const authHeader=request.headers["authorization"];
    if (authHeader!==undefined){
        jwtToken=authHeader.split(" ")[1];
    }
    if (jwtToken===undefined){
        response.status(401);
        response.send("Invalid Access Token");
    }else{
        jwt.verify(jwtToken,"My_secret_Token",async(error,payload)=>{
           if (error){
               response.send("Invalid Access Token");
           }else{
               const {id}=request.params;
               const getAllUsersQuery=`SELECT Name,Email FROM user WHERE id='${id}';`;
               const user=await db.get(getAllUsersQuery);
               response.send(user);
           }
        });
    }
});

//API 5

app.put("/updateProfile/:id/",async (request,response)=>{
   let jwtToken;
   const authHeader=request.headers["authorization"];
   if (authHeader!==undefined){
       jwtToken=authHeader.split(" ")[1];
   }
   if (jwtToken===undefined){
       response.status(401);
       response.send("Invalid Access Token");
   }else{
       let updateValue='';
       jwt.verify(jwtToken,"My_secret_Token",async(error,payload)=>{
           if (error){
            response.send("Invalid Access Token");
           }else{
               const {Name, Email, Password, Age, Gender, Company, Designation, about}=request.body;
               const {id}=request.params;
               if (Name!==undefined){
                  updateValue=updateValue+`Name='${Name}',`;
               }
               if (Email!==undefined){
                   const newEmail=Email.match(/\S+@\S+\.\S+/);
                   if (newEmail!==null){
                    updateValue=updateValue+`Email='${newEmail}',`;
                   }else{
                       response.send("Email is not valid")
                   }  
               }
               if (Password!==undefined){
                   const newPassword=Password.match(/[A-Z]/g) && Password.match(/[^a-zA-Z\d]/g) && Password.length>=8;
                   if(newPassword!==null){
                      updateValue=updateValue+`Password='${newPassword}',`;
                   }else{
                    response.send("Password should have 1 uppercase letter, 1 special character and minimum 8 digit password");
                }
               }
               if (Age!==undefined){
                   updateValue=updateValue+`Age='${Age}',`;
               }
               if (Gender!==undefined){
                   updateValue=updateValue+`Gender='${Gender}',`;
               }
               if (Company!==undefined){
                   updateValue=updateValue+`Company='${Company}',`;
               }
               if (Designation!==undefined){
                   updateValue=updateValue+`Designation='${Designation}',`;
               }
               if (about!==undefined){
                   updateValue=updateValue+`about='${about}',`;
               }
              updateValue=updateValue.slice(0,-1);
              const updateQuery=`UPDATE user SET ${updateValue} WHERE id='${id}';`; 
              await db.run(updateQuery);
              response.send("Updated Successfully");
            }
       })
   }
});

//API 6

app.delete("/deleteUser/:id/",async(request,response)=>{
    let jwtToken;
    const authHeader=request.headers["authorization"];
    if (authHeader!==undefined){
        jwtToken=authHeader.split(" ")[1];
    }
    if (jwtToken===undefined){
        response.status(401);
        response.send("Invalid Access Token");
    }else{
        jwt.verify(jwtToken,"My_secret_Token",async(error,payload)=>{
           if (error){
               response.send("Invalid Access Token");
           }else{
               const {id}=request.params;
               const deleteUserQuery=`DELETE FROM user WHERE id='${id}';`;
               await db.run(deleteUserQuery);
               response.send("Deleted Successfully.");
           }
        });
    }
});

module.exports=app;