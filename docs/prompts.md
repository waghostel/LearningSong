Run eslint on the entire codebase to perform a lint checking and save report into  ./report/lint-checking/  with a spcific file name and time stamp. Format the report as a checklist (Todo list). Group the items by file path. Prioritize files containing 'Errors' at the top (Urgent), followed by files with only 'Warnings' (Low Risk).

Note: When running eslint, dumpt the result to a file in ./temp folder first.


Run the frontend test with pnpm test following by create a test report with time stamp in ./report/frontend-test. List the errors as a todo list from urgent to low risk. Take a reference of .kiro\hooks\eslint-report-generator.kiro.hook as an example.