var sql = require('mssql');

sql.connect("mssql://M4PROD:5D7TMNO41A@CLSESA57/M4PROD").then(function() {
    // Query
    new sql.Request()
        .query("SELECT * FROM STD_HR_PERIOD WHERE ID_ORGANIZATION='0002' AND STD_ID_HR='FR0007595'")
        .then(function(recordset) {
        console.dir(recordset);
    }).catch(function(err) {
        console.log(err);
    });

    // Stored Procedure
    /*new sql.Request()
    .input('input_parameter', sql.Int, value)
    .output('output_parameter', sql.VarChar(50))
    .execute('procedure_name').then(function(recordsets) {
        console.dir(recordsets);
    }).catch(function(err) {
        // ... execute error checks
    });*/
}).catch(function(err) {
    console.log(err);
});
