## Data Synthesizer Basic

Non-Angular Implementation of the data synthesizer

This library is identical in function to the data synthesizer service for Angular, but with all Angular
dependencies removed. It is a plain Javascript implementation, easily used in React, Vue, etc.

The Angular-based data synthesizer code is at [https://github.com/scheid/data-synthesizer](https://github.com/scheid/data-synthesizer)

The NPM Package for the Angular data synthesizer, along with all documentation, is at [https://www.npmjs.com/package/data-synthesizer](https://www.npmjs.com/package/data-synthesizer).

Note, in the example below, the DataSynthConfig import is [of the form illustrated here](https://github.com/scheid/data-synthesizer-demo/blob/master/src/app/data-synth-config.ts)

Then, in React for example:

```

...

import {DataSynthesizerServiceBasic} from 'data-synthesizer-basic';

//assuming you have defined your config object in another file
import DataSynthConfig from "../../data-synth-config";

...

class DataSynthesizerDemoComponent extends React.Component {

    ...

    dataSynthesizerService = new DataSynthesizerServiceBasic();

    ...

	componentDidMount() {

	    this.dataSynthesizerService.generateDataset(DataSynthConfig).subscribe(
	        (data) => {
	            
	            this.generatedDataset = data;

	            this.setState({generatedItems: data});
	            console.log('data', data);


	        },
	        (err) => {
	            console.log('error generating data set', err);
	        }
	    );

	}


}

```