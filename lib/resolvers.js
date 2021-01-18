const connectDb = require('./db');
const { ObjectID } = require('mongodb');

function returnNeededData(collectionName, listOfOtherCollections){
    return new Promise(async (resolve, reject) => {
        let db, collection;
        try{
            db = await connectDb();
            collection = await db.collection(collectionName);
            if(listOfOtherCollections == null){
                resolve(collection);
            }
            else{
                let array = [collection, listOfOtherCollections];
                resolve(array);
            }
        }catch(e){
            console.error(e);
            reject(e);
        }
    });
}

async function workCases(collection, caseString, relation, defaults){
    try
    {
        switch(caseString){
            case "returnAll":
                return await collection.find().toArray();
            case "returnOne":
                return await collection.findOne(relation);
            case "insertData":
                const newInput = Object.assign(defaults, relation);
                let output = await collection.insertOne(newInput);
                newInput._id = output.insertedId;
                return newInput;
            case "insertFirstToSecondByParameter":
                // El primer valor de los arrays hace referencia a lo que insertaremos
                let valueToInsert = await collection[0].findOne(relation[0]);
                // El segundo valor de los arrays hace referencia a la coleccion a la que vamos a insertar
                let valueToReceiveInsertion  = await collection[1].findOne(relation[1]);

                if(!valueToReceiveInsertion == null || !valueToInsert == null ) throw new Error('No se encontro el valor a insertar o el receptor de dicha insercion.');

                // El tercer parametro en relation es para conocer la relacion a la cual le pertenece el objeto a insertar
                await collection[1].updateOne(relation[1], relation[2]);

                return valueToReceiveInsertion;
            case "mapArrayInCollection":
                // Tomaremos los ids del array al cual mapearemos. Ejemplo: En Course, queremos mapear el array de Students, esto sera un array de _id de students.
                let ids = relation != null ? relation.map(id => ObjectID(id._id)) : [];
                // Tomaremos de la base de datos los valores correspondientes y los devolveremos como el respectivo array.
                let arrayData = ids.length > 0 ? await collection.find({_id: {$in: ids}}).toArray() : [];

                return arrayData;
        }
    }catch(e){
        console.log(e)
    }

}

module.exports = {
    Query:  {
        getCourses: async () => {
            let courses = returnNeededData('courses')
                .then((collection) => workCases(collection, "returnAll"));
            return courses;
        },
        getCourse: async (root, { id }) => {
            let course = returnNeededData('courses')
                .then((collection) => workCases(collection, "returnOne", {_id: ObjectID(id)}));
            return course;
        },

        getStudentByIdentification: async (root, { identification }) => {
            let course = returnNeededData('students')
                .then((collection) => workCases(collection, "returnOne", {identification: identification}));
            return course;
        },
        
    },
    Mutation:   {
        createCourse: async (root, { input }) => {
            let course = returnNeededData('courses')
                .then((collection) => workCases(collection, "insertData", input, {
                    teacher: '',
                    topic: ''
                }));
            console.log(course);
            return course;
        },
        createStudent: async (root, { input }) => {
            let course = returnNeededData('students')
                .then((collection) => workCases(collection, "insertData", input, {
                    email: 'unknown@mail.com'
                }));
            console.log(course);
            return course;
        },
        addStudentToCourse: async (root, { idCourse, idStudent }) => {
            // Obtendremos la colección de students
            let course = returnNeededData('students').then((studentsCollection) => {
            // Obtendremos la colección de courses, y le pasaremos la de students
                return returnNeededData('courses', [studentsCollection])
            }).then((studentsCoursesCollectionsInAList) => 
                // El primer parametro le pasamos la colección de students, al de courses, y el parametro de courses al que le agregaremos el student,
                // haciendo uso de los parametros dinámicos en javascript
                workCases([studentsCoursesCollectionsInAList[1][0], studentsCoursesCollectionsInAList[0]], 
                'insertFirstToSecondByParameter', 
                [{ _id: ObjectID(idStudent) }, { _id: ObjectID(idCourse) } , { $addToSet: { students : { _id: ObjectID(idStudent) } } }])
            )
            return course;
        }
    },
    Course: {
        students: async ({ students }) => {
            let studentsToReturn = returnNeededData('students').then((collection) => workCases(collection, 'mapArrayInCollection', students))

            return studentsToReturn;
        }
    }

};