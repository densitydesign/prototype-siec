function MapTypologies(id, swiss, data) {

    this.id = id;

    if (data) {
        this.data = d3.nest()
            .key(function(d) { return d.survey_year; })
            .entries(data);
        // console.log(this.data);
        // console.log(swiss);
    }


    // check if svg has already been created and if not, creates it
    if (!this.svg) {

    }

    this.draw = function(year) {

    }
}
