const express=require('express');
const app=express();
const bodyParser=require('body-parser');
const ejs=require('ejs');
var mysql=require('mysql2/promise');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '^^eRyt#r099',
    database: 'diseasedb',
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
    idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    namedPlaceholders:true
    }
);
var HID=69;
var DOCID=69;
var loggedIn;
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

var HomeName="";
var HomeEmail="";

app.get("/", function(req, res){
    async function renderHome(){
    if(DOCID==69)
        loggedIn=false;
    else{
        loggedIn=true;
        await getHomeDetails();
    }
    res.render("homepage", {loggedIn:loggedIn, docname:HomeName, docemail:HomeEmail});
    }

    renderHome();

    async function getHomeDetails(){
        return new Promise((resolve, reject) => {
            db.query('SELECT NAME,EMAIL FROM doctor where DOCID=?',[DOCID])
            .then(function([results, fields]) {
                HomeEmail=results[0].EMAIL;
                HomeName=results[0].NAME;
                resolve();
            })
            .catch(function(err){
                console.log(err);
                reject(err);
            })
            })
    }
})
var docInfo;
var profHID;
var hospInfo;
var diseaseHistory=[];
var medicineInfo=[];
var symptomInfo=[];
var patientInfo=[];
var prevDisInfo=[];

app.get("/profile", function(req, res){
    if(DOCID==69)
        console.log("Log in first!")
    else
        renderProfile();

    async function getDocDetails(){
    return new Promise((resolve, reject) => {
    db.query('SELECT * FROM doctor where DOCID=?',[DOCID])
    .then(function([results, fields]) {
        profHID=results[0].HID;
        docInfo=results[0];
        resolve();
    })
    .catch(function(err){
        console.log(err);
        reject(err);
    })
    })
    }


    async function getDiseaseHistory(){
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM disease where DOCID=?',[DOCID])
            .then(function([results, fields]) {
                diseaseHistory=results;
                resolve();
            })
            .catch(function(err){
                console.log(err);
                reject(err);
            })
            })
    }

    async function getHospitalDetails(){
        return new Promise((resolve, reject) => {
        db.query('SELECT * FROM hospital where HID=?',[profHID])
        .then(function([results, fields]) {
            hospInfo=results[0];
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    }

    async function getPatientDetails(indiPID){
        return new Promise((resolve, reject) => {
        db.query('SELECT AGE,GENDER,NATIONALITY FROM patient where PID=?',[indiPID])
        .then(function([results, fields]) {
            patientInfo.push(results);
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    }

    async function getMedicineDetails(indiDID){
        return new Promise((resolve, reject) => {
        db.query('SELECT NAME,DOSAGE FROM medicine where DID=?',[indiDID])
        .then(function([results, fields]) {
            medicineInfo.push(results);
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    }

    async function getSymptoms(indiDID){
        return new Promise((resolve, reject) => {
        db.query('SELECT SymName from symptoms where DID=?',[indiDID])
        .then(function([results, fields]) {
            symptomInfo.push(results);
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    }
    async function getprevDis(indiPID){
        return new Promise((resolve, reject) => {
        db.query('SELECT * from previousdiseases where PID=?',[indiPID])
        .then(function([results, fields]) {
            prevDisInfo.push(results);
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    }

    async function getIndividualDetails(){
        for(let disease of diseaseHistory) {
             await Promise.all([getSymptoms(disease.DID),getMedicineDetails(disease.DID),getPatientDetails(disease.PID),getprevDis(disease.PID)]);
        }
    }    

    async function renderProfile(){
        await Promise.all([getDocDetails(), getDiseaseHistory()]);
        await Promise.all([getHospitalDetails(),getIndividualDetails()]);
        res.render("profile", {doctor:docInfo, hospital: hospInfo, history:diseaseHistory,medicine:medicineInfo, patient:patientInfo, symptoms:symptomInfo, previousDis:prevDisInfo,loggedIn:loggedIn,docname:HomeName, docemail:HomeEmail});
        docInfo="";
        profHID="";
        hospInfo="";
        diseaseHistory=[];
        medicineInfo=[];
        symptomInfo=[];
        patientInfo=[];
        prevDisInfo=[];
    }

})

app.post("/edit",function(req, res){
    var updateDID=req.body.DID;
    var updateDName=req.body.DiseaseName;
    var updateDOutcome=req.body.OUTCOME;
    var updateDSE=req.body.SIDE_EFFECTS;
    async function updateDisease(){
            db.query('UPDATE disease set NAME=?, OUTCOME=?, SIDE_EFFECTS=? WHERE DID=?',[updateDName,updateDOutcome,updateDSE,updateDID])
            .then(function([results, fie]){
                console.log("Successfully updated disease record with DID "+updateDID);
            })
            .catch(function(err){
                console.log(err);
            })
    }
    async function renderUpdates(){
        await updateDisease();
        res.redirect("/profile");
    }
    renderUpdates();
})

app.get("/login", function(req, res){
    res.render("login",{loggedIn:loggedIn,docname:HomeName, docemail:HomeEmail});
})

app.post("/login", function(req, res){
    var logEmail=req.body.email;
    var logPass=req.body.password;
    db.query('SELECT DOCID from doctor where EMAIL=? AND PASS=?',[logEmail,logPass])
    .then(function([results, fields]) {
        DOCID=results[0].DOCID;
        console.log("Successfully logged in! DOCID is "+DOCID);

        res.redirect("/");
    })
    .catch(function(err){
        console.log("No such user found. Try again");
        res.redirect("/login");
    })

})

app.get("/signup", function(req, res){
    res.render("signup",{loggedIn:loggedIn,docname:HomeName, docemail:HomeEmail});
})

app.post("/signup", function(req, res){
    var DocName=req.body.name;
    var DocEmail=req.body.email;
    var DocPass=req.body.password;
    var yearsExp=req.body.YearsExp;
    var hosName=req.body.hosname;
    var hosCity=req.body.hoscity;
    var hosCountry=req.body.hoscountry;

    async function insertHospital(){
        return new Promise((resolve, reject) => {
        db.query('INSERT INTO hospital(NAME,CITY,COUNTRY) values(?,?,?)', [hosName,hosCity,hosCountry])
        .then(function([result, fields]){
            HID=result.insertId;
            console.log("SUCCESSFULLY INSERTED HOSPITAL DETAILS!!");
            res.redirect("/");
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    }

    async function insertDoctor(){
        await insertHospital();
        db.query('INSERT INTO doctor(NAME,EMAIL,PASS,YearsExp,HID) values(?,?,?,?,?)', [DocName, DocEmail, DocPass, yearsExp,HID])
        .then(function([result, fields]){
            console.log("SUCCESSFULLY INSERTED DOCTOR PROFILE TO DATABASE!!");
        })
        .catch(function(err){
            console.log(err);
        })
    }
    insertDoctor();
})

// var anime={toSqlString: function() { return 'anime'; }}
app.get('/search', function(req, res){
        if(DOCID==69)
            loggedIn=false;
        else
            loggedIn=true;
    res.render("search", {loggedIn:loggedIn,docname:HomeName, docemail:HomeEmail,diseaseSnippets:[],doctors:[]});
});

// app.post("/search", function(req, res){
//     if(req.body.searchbut==1)
//         res.render("searchSymptoms", {diseaseSnippets:[],doctors:[]});
//     else   
//         res.render("searchDisease",{dis:[{SymName:""}]});
// })

// app.post("/search", function(req, res){
//     if(req.body.searchbut==1)
//         res.redirect("/searchSymptoms");
//     else   
//         res.redirect("searchDisease");
// })

app.listen(3000, function(req, res){
    console.log("Server running in port 3000");
});


/*
query to get did against set of symptoms. Run a for loop and decrement values of having count to get more accurate to less accurate sorting
SELECT DID
FROM symptoms
WHERE SymptomName IN ('Symptom1', 'Symptom2', 'Symptom3')
GROUP BY DID
HAVING COUNT(DISTINCT SymptomName) = 3;
*/

var noResult=[{NAME:"No disease found"}];
var DIDResults=[];
var finalResults=[];
var DocNames=[];

app.post("/searchSymptoms", function(req, res){
        var symArray=req.body.symptoms.split(",");

        async function getRelevance(i){
            return new Promise((resolve, reject) => {
                db.query('select DID from symptoms where SymName IN(?) GROUP BY DID HAVING COUNT(DISTINCT SymName) = ?'
            ,[symArray,symArray.length-i])
            .then(function([resu, fields]) {
                if(resu.length>0)
                    resu.forEach(function(results){
                    DIDResults.push(results.DID);
                })
                resolve();
                // console.log(DIDResults);
            })
            .catch(function(err){
                console.log(err);
                reject();
            })
        })
        }

        async function getResultDID(){
            for(let i=0;i<symArray.length;i++){
                await getRelevance(i);
            }
        }

        async function getDocName(searchDOCID){
            return new Promise((resolve, reject) => {
            db.query('SELECT NAME FROM doctor where DOCID=?',[searchDOCID])
            .then(function([results, fields]) {
                DocNames.push(results[0].NAME);
                resolve();
            })
            .catch(function(err){
                console.log(err);
                reject(err);
            })
            })
        }


        async function getDiseaseSnippet(searchDID){
            return new Promise((resolve, reject) => {
                db.query('SELECT DID,NAME,OUTCOME,DOCID FROM disease where DID=?',[searchDID])
                .then(function([results, fields]) {
                    finalResults.push(results);
                    resolve();
                })
                .catch(function(err){
                    console.log(err);
                    reject(err);
                })
                })
    }
    
        async function renderResults(){
            var i=0;
            await getResultDID();
            if(DIDResults.length>0){
                for(let DID of DIDResults){
                    await getDiseaseSnippet(DID);
                    await getDocName(finalResults[i++][0].DOCID);
                }
                res.render("search", {diseaseSnippets:finalResults, doctors:DocNames,loggedIn:loggedIn,docname:HomeName, docemail:HomeEmail});
            }
            else
                res.render("search", {diseaseSnippets:[],doctors:[],loggedIn:loggedIn,docname:HomeName, docemail:HomeEmail});
            DIDResults=[];
            finalResults=[];
            DocNames=[];
        }
    
        renderResults();
})

app.post("/searchDisease", function(req, res){
    var disName=req.body.diseaseName;
    async function getResultDID(){
        return new Promise((resolve, reject) => {
            db.query('select DID from disease where NAME=?',[disName])
        .then(function([resu, fields]) {
            if(resu.length>0)
                resu.forEach(function(results){
                DIDResults.push(results.DID);
            })
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject();
        })
    })
    }    
            async function getDocName(searchDOCID){
                return new Promise((resolve, reject) => {
                db.query('SELECT NAME FROM doctor where DOCID=?',[searchDOCID])
                .then(function([results, fields]) {
                    DocNames.push(results[0].NAME);
                    resolve();
                })
                .catch(function(err){
                    console.log(err);
                    reject(err);
                })
                })
            }
    
    
            async function getDiseaseSnippet(searchDID){
                return new Promise((resolve, reject) => {
                    db.query('SELECT DID,NAME,OUTCOME,DOCID FROM disease where DID=?',[searchDID])
                    .then(function([results, fields]) {
                        finalResults.push(results);
                        resolve();
                    })
                    .catch(function(err){
                        console.log(err);
                        reject(err);
                    })
                    })
        }
        
            async function renderResults(){
                var i=0;
                await getResultDID();
                if(DIDResults.length>0){
                    for(let DID of DIDResults){
                        await getDiseaseSnippet(DID);
                        await getDocName(finalResults[i++][0].DOCID);
                    }
                    res.render("search", {diseaseSnippets:finalResults, doctors:DocNames,loggedIn:loggedIn,docname:HomeName, docemail:HomeEmail});
                }
                else
                    res.render("search", {diseaseSnippets:[],doctors:[],loggedIn:loggedIn,docname:HomeName, docemail:HomeEmail});
                DIDResults=[];
                finalResults=[];
                DocNames=[];
            }
        
            renderResults();
})

// app.get("/practice",function(req, res){
//     res.render("details",{loggedIn:loggedIn,docname:HomeName, docemail:HomeEmail});
// })

var detailDOCID;
var detailHID;
var detailPID;
var docDetails;
var previousDetails;
var symptomDetails;
var medicineDetails;
var patientDetails;
var hospDetails;
var diseasedetails=[];

app.get("/admin", function(req, res){
    var reportArray=[];
    async function getReports(){
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM report')
            .then(function([results, fie]){
                reportArray=results;
                resolve();
            })
            .catch(function(err){
                console.log(err);
                reject(err);
            })
        })
    }
    async function renderAdmin(){
            await getReports();
            if(DOCID==69)
            loggedIn=false;
        else
            loggedIn=true;
            res.render("adminpanel", {docDetails:docDetails,patientDetails:patientDetails,hospDetails:hospDetails,diseasedetails:diseasedetails,medicineDetails:medicineDetails,symptomDetails:symptomDetails,previousDetails:previousDetails,reports:reportArray,loggedIn:loggedIn, docname:HomeName, docemail:HomeEmail});
    }
    if(DOCID==8)
        renderAdmin();
    else
        console.log("Not authorized. Please contact an admin");
})

app.post("/admin", function(req,res){
    var gotoDID=req.body.DID;
    async function getDoctorDetails(searchDOCID){
        return new Promise((resolve, reject) => {
        db.query('SELECT * FROM doctor where DOCID=?',[searchDOCID])
        .then(function([results, fields]) {
            docDetails=results;
            detailHID=results[0].HID;
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
        })
    }

    async function getDiseaseDetails(searchDID){
        return new Promise((resolve, reject) => {
            db.query('SELECT * from disease where DID=?',[searchDID])
            .then(function([results, fields]) {
                diseasedetails=results;
                detailPID=results[0].PID;
                detailDOCID=results[0].DOCID;
                resolve();
            })
            .catch(function(err){
                console.log(err);
                reject(err);
            })
            })
    }
    async function getHospitalDetails(HID){
        return new Promise((resolve, reject) => {
        db.query('SELECT * FROM hospital where HID=?',[HID])
        .then(function([results, fields]) {
            hospDetails=results;
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    }

    async function getPatientDetails(PID){
        return new Promise((resolve, reject) => {
        db.query('SELECT * FROM patient where PID=?',[PID])
        .then(function([results, fields]) {
            patientDetails=results;
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    }

    async function getMedicineDetails(DID){
        return new Promise((resolve, reject) => {
        db.query('SELECT NAME,DOSAGE FROM medicine where DID=?',[DID])
        .then(function([results, fields]) {
            medicineDetails=results;
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    }

    async function getSymptoms(DID){
        return new Promise((resolve, reject) => {
        db.query('SELECT SymName from symptoms where DID=?',[DID])
        .then(function([results, fields]) {
            symptomDetails=results;
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    }
    async function getprevDis(PID){
        return new Promise((resolve, reject) => {
        db.query('SELECT * from previousdiseases where PID=?',[PID])
        .then(function([results, fields]) {
            previousDetails=results;
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    } 
    var reportArray=[];
    async function selectReport(){
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM report')
            .then(function([results, fie]){
                reportArray=results;
                resolve();
            })
            .catch(function(err){
                console.log(err);
                reject(err);
            })
        })
    }
    async function renderDetails(){
        await getDiseaseDetails(gotoDID);
        await Promise.all([getDoctorDetails(detailDOCID), getPatientDetails(detailPID),getSymptoms(gotoDID),getMedicineDetails(gotoDID)]);
        await Promise.all([getHospitalDetails(detailHID),getprevDis(detailPID),selectReport()]);
        if(DOCID==69)
        loggedIn=false;
    else
        loggedIn=true;
        res.render("adminpanel", {docDetails:docDetails,patientDetails:patientDetails,hospDetails:hospDetails,diseasedetails:diseasedetails,medicineDetails:medicineDetails,symptomDetails:symptomDetails,previousDetails:previousDetails,reports:reportArray,loggedIn:loggedIn,docname:HomeName, docemail:HomeEmail});
    }

    renderDetails();
})

app.post("/report", function(req, res){
    var reason=req.body.reason;
    var reportDID=req.body.DID;
    async function insertReport(){
        return new Promise((resolve, reject) => {
        db.query('INSERT INTO report values(?,?,?)', [DOCID,reportDID,reason])
        .then(function([resu, fie]){

            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
        })
    }
    insertReport();

    res.render("search", {loggedIn:loggedIn,docname:HomeName, docemail:HomeEmail,diseaseSnippets:[],doctors:[]});
})

app.post("/details",function(req, res){
    var detailDID=req.body.DID;
    var detailDOCID;
    var detailHID;
    var detailPID;
    var docDetails;
    var previousDetails;
    var symptomDetails;
    var medicineDetails;
    var patientDetails;
    var hospDetails;
    var diseasedetails;

    async function getDoctorDetails(searchDOCID){
        return new Promise((resolve, reject) => {
        db.query('SELECT * FROM doctor where DOCID=?',[searchDOCID])
        .then(function([results, fields]) {
            docDetails=results;
            detailHID=results[0].HID;
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
        })
    }

    async function getDiseaseDetails(searchDID){
        return new Promise((resolve, reject) => {
            db.query('SELECT * from disease where DID=?',[searchDID])
            .then(function([results, fields]) {
                diseasedetails=results;
                detailPID=results[0].PID;
                detailDOCID=results[0].DOCID;
                resolve();
            })
            .catch(function(err){
                console.log(err);
                reject(err);
            })
            })
    }
    async function getHospitalDetails(HID){
        return new Promise((resolve, reject) => {
        db.query('SELECT * FROM hospital where HID=?',[HID])
        .then(function([results, fields]) {
            hospDetails=results;
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    }

    async function getPatientDetails(PID){
        return new Promise((resolve, reject) => {
        db.query('SELECT * FROM patient where PID=?',[PID])
        .then(function([results, fields]) {
            patientDetails=results;
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    }

    async function getMedicineDetails(DID){
        return new Promise((resolve, reject) => {
        db.query('SELECT NAME,DOSAGE FROM medicine where DID=?',[DID])
        .then(function([results, fields]) {
            medicineDetails=results;
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    }

    async function getSymptoms(DID){
        return new Promise((resolve, reject) => {
        db.query('SELECT SymName from symptoms where DID=?',[DID])
        .then(function([results, fields]) {
            symptomDetails=results;
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    }
    async function getprevDis(PID){
        return new Promise((resolve, reject) => {
        db.query('SELECT * from previousdiseases where PID=?',[PID])
        .then(function([results, fields]) {
            previousDetails=results;
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    } 

    async function renderDetails(){
        await getDiseaseDetails(detailDID);
        await Promise.all([getDoctorDetails(detailDOCID), getPatientDetails(detailPID),getSymptoms(detailDID),getMedicineDetails(detailDID)]);
        await Promise.all([getHospitalDetails(detailHID),getprevDis(detailPID)]);
        res.render("details", {docDetails:docDetails,patientDetails:patientDetails,hospDetails:hospDetails,diseasedetails:diseasedetails,medicineDetails:medicineDetails,symptomDetails:symptomDetails,previousDetails:previousDetails,loggedIn:loggedIn,docname:HomeName, docemail:HomeEmail});
    }

    renderDetails();
})

app.get("/addDisease", function(req, res){
    res.render("newEntry",{loggedIn:loggedIn, docname:HomeName, docemail:HomeEmail});
})

app.post("/addDisease", function(req, res){
    //disease
    const addDisease=req.body.DiseaseName;
    const addOutcome=req.body.Outcome;
    const addSymptoms=req.body.Symptoms.split(",");
    const addSideEff=req.body.SideEff;
    //medicine
    const addMedicine=req.body.MedicineName;
    const AddDosage=req.body.MDosage;
    //patient
    const addAge=req.body.PAge;
    const addGender=req.body.PGender;
    const addNationality=req.body.PNationality;
    const addprevDiseases=req.body.PrevDis.split(",");
    var addPID;
    var DID;
    console.log(req.body);

    async function insertMed(){
        db.query('INSERT INTO medicine(DID,NAME,DOSAGE) values(?,?,?)', [DID,addMedicine,AddDosage])
        .then(function([result, fields]){
            console.log("SUCCESSFULLY INSERTED MEDICINE");
        })
        .catch(function(err){
            console.log(err);
        })
    }

    async function addNewEntry(){
        await insertPatient();
        console.log("This should show up after PID gets logged");
        await insertDisease();
        await insertSymptoms();
        await insertPrevDis();
        await insertMed();
        res.redirect("/");
    }

    async function insertPatient(){
        return new Promise((resolve, reject) => {
        db.query('INSERT INTO patient(AGE,GENDER,NATIONALITY) values(?,?,?)', [addAge,addGender,addNationality]).then(function([resu, fie]){
            addPID=resu.insertId;
            console.log(addPID);
            resolve();
        })
        .catch(function(err){
            console.log(err);
            reject(err);
        })
        })
    }

    async function insertDisease(){
        return new Promise((resolve, reject) => {
        db.query("INSERT INTO disease(NAME, OUTCOME, SIDE_EFFECTS,PID, DOCID) values(?,?,?,?,?)", [addDisease, addOutcome,addSideEff,addPID, DOCID])
        .then(function([res,fi]){
            DID=res.insertId;
            console.log(DID);
            console.log("SUCCESSFULLY INSERTED DISEASE");
            resolve();
        }).catch(function(err){
            console.log(err);
            reject(err);
        })
    })
    }

    async function insertSymptoms(){
    addSymptoms.forEach(function(symptom){
        db.query("INSERT INTO symptoms values(?,?)", [DID, symptom])
        .then(function(){
            console.log("SUCCESSFULLY INSERTED SYMPTOM");
        }).catch(function(err){
            console.log(err);
        })
    })
    }

    async function insertPrevDis(){
        addprevDiseases.forEach(function(prevDisease){
            db.query("INSERT INTO previousdiseases values(?,?)", [addPID, prevDisease])
            .then(function(){
                console.log("SUCCESSFULLY INSERTED PREVIOUS DISEASE");
            }).catch(function(err){
                console.log(err);
            })
        })
    }

    addNewEntry();
})

app.post("/delete", function(req,res){
    var deleteDID=req.body.DID;
    // var deletePID=req.body.PID;

    async function deleteDisease(){
        db.query("DELETE from disease where DID=?",[deleteDID])
        .then(function(){
            console.log("Deleted disease with DID "+deleteDID);
        }).catch(function(err){
            console.log(err);
        })
    }

    // async function deletePatient(){
    //     db.query("DELETE from patient where PID=?",[deletePID])
    //     .then(function(){
    //         console.log("Deleted patient with PID"+deletePID);
    //     }).catch(function(err){
    //         console.log(err);
    //     })  
    // }

    async function deleteDependants(){
        await Promise.all([
        db.query("DELETE from symptoms where DID=?",[deleteDID])
        .then(function(){
            console.log("Deleted symptoms with DID "+deleteDID);
        }).catch(function(err){
            console.log(err);
        }),
        db.query("DELETE from medicine where DID=?",[deleteDID])
        .then(function(){
            console.log("Deleted medicines with DID "+deleteDID);
        }).catch(function(err){
            console.log(err);
        }),
        db.query("DELETE from report where DID=?",[deleteDID])
        .then(function(){
            console.log("Deleted report with DID "+deleteDID);
        }).catch(function(err){
            console.log(err);
        })
        // db.query("DELETE from previousdiseases where PID=?",[deletePID])
        // .then(function(){
        //     console.log("Deleted previous diseases with PID"+deletePID);
        // }).catch(function(err){
        //     console.log(err);
        // })
    ])}
    
    async function deleteRecord(){
        await deleteDependants();
        await deleteDisease();
        res.redirect("/admin");
    }
    deleteRecord();
})