# PlantOS — Refined Build Plan

> **Implementation status (overnight):** Running app is in [`plantos/`](plantos/). See [`PLANTOS_STATUS.md`](PLANTOS_STATUS.md), [`plantos/README.md`](plantos/README.md), and [`DEMO_JOURNEY.md`](DEMO_JOURNEY.md). Controlling lock: [`PRODUCT_LOCK.md`](PRODUCT_LOCK.md).

## 1. Lock the product

* Use the HAI industrial plant dataset.
* Use the normal-operation data as the main plant history.
* Make the plant appear continuously live.
* Let different users ask questions about the same running plant.
* Generate a different visual response based on the user’s role.
* Keep the system read-only.
* Do not add equipment controls.
* Do not position it as a replacement for the PLC or safety HMI.

## 2. Choose the first user roles

Build three complete roles:

* Engineer
* Operations manager
* Finance

Add electrician or maintenance only after the first three work.

## 3. Understand the HAI plant data

* Download the HAI dataset.
* Find the normal-operation files.
* Understand what each plant area represents.
* Identify the main process areas:

  * Boiler
  * Turbine
  * Generator or power process
  * Water treatment
* Identify measurements, equipment states, commands, and setpoints.
* Select only the most useful tags for the demo.
* Give technical tag names readable labels.
* Record the units and expected operating ranges.

## 4. Create the plant structure

* Create one simple plant hierarchy.
* Connect each selected tag to the correct process and equipment.
* Show how the main processes connect.

Example:

* Water treatment supports the boiler.

* The boiler produces steam.

* Steam drives the turbine.

* The turbine produces power.

* Add simple names for equipment.

* Add normal operating ranges.

* Add warning limits where useful.

* Add a short description for every selected tag.

## 5. Prepare the historical data

* Keep the original HAI data unchanged as the source copy.
* Create a clean copy for the application.
* Check timestamps.
* Check missing values.
* Check duplicate rows.
* Check incorrect data types.
* Confirm that selected tags have continuous values.
* Confirm normal-operation periods are clearly identified.
* Keep enough data to compare:

  * Current operation
  * Previous hour
  * Previous shift
  * Similar historical periods

## 6. Upload the data to ClickHouse

* Create the ClickHouse service.
* Upload the complete normal plant history.
* Confirm all files were loaded.
* Check the total number of records.
* Check the first and latest timestamps.
* Check the number of unique tags.
* Confirm every selected plant area is represented.
* Confirm each selected tag can be queried over time.
* Save the actual row count for the demo.

## 7. Make the plant data live

* Select one continuous normal-operation period.
* Replay the data using current timestamps.
* Send new plant readings into ClickHouse continuously.
* Keep the original order between the readings.
* Let values update every few seconds.
* Continue the replay in a loop when it reaches the end.
* Show the latest plant timestamp on the screen.
* Show whether the live data feed is active.
* Add simple controls:

  * Start
  * Pause
  * Reset
  * Increase speed
* Keep a preloaded fallback if the live replay fails.

## 8. Add production meaning

The HAI data shows plant operation, but it may not directly show business production.

Add simple transparent assumptions:

* Generator output represents plant production.
* Define the production unit.
* Define a shift target.
* Define a daily target.
* Define expected plant capacity.
* Define planned operating efficiency.
* Calculate current production rate.
* Calculate production completed this shift.
* Calculate projected production by the end of the shift.

Clearly label these as demo assumptions.

## 9. Add financial meaning

Create a small synthetic business layer:

* Electricity or product value
* Energy or fuel cost
* Labour cost
* Fixed operating cost
* Cost per hour
* Planned revenue
* Cost per unit produced
* Shift production target
* Daily production target

Use plant values to calculate:

* Production value so far
* Operating cost so far
* Cost per unit
* Estimated shift revenue
* Estimated shift margin
* Projected end-of-day result

Show every assumption inside the application.

## 10. Validate ClickHouse first

Ask simple questions directly from the data:

* What is the plant producing now?
* What is the current generator output?
* Is the turbine operating within its normal range?
* What is the current boiler pressure?
* Which equipment is closest to its operating limit?
* How has output changed during the last hour?
* How does this shift compare with the previous shift?
* Are we meeting the production target?
* What is the current cost per unit?
* What is today’s estimated production value?

For every answer:

* Check the original data.
* Confirm the correct time range.
* Confirm the correct equipment.
* Confirm the calculations.
* Measure the real query time.
* Do not build the final interface until the answers are reliable.

## 11. Define the engineer experience

Main question:

**What is the current status of the generators and turbine?**

The investigation should check:

* Current generator output
* Turbine speed
* Boiler pressure
* Steam flow
* Equipment states
* Controller outputs
* Current values versus normal ranges
* Current values versus previous periods
* Related process conditions

The visual response should include:

* Plant process view
* Generator faceplates
* Turbine faceplate
* Live measurements
* Normal operating bands
* Current trends
* Equipment comparison
* Areas needing attention
* Supporting data drawer

## 12. Define the operations experience

Main question:

**Are we meeting today’s production target?**

The investigation should check:

* Current output
* Shift production
* Planned target
* Plant capacity
* Process efficiency
* Current operating rate
* Historical shift performance
* Expected production by shift end
* Process areas limiting output

The visual response should include:

* Current production flow
* Actual versus target
* Shift progress
* Production forecast
* Process capacity
* Bottleneck view
* Previous-shift comparison
* Supporting assumptions

## 13. Define the finance experience

Main question:

**What is today’s production worth, and what has it cost?**

The investigation should check:

* Production completed
* Current production rate
* Product or electricity value
* Energy and operating costs
* Cost per unit
* Expected shift revenue
* Expected margin
* Difference from plan

The visual response should include:

* Production value counter
* Operating-cost counter
* Revenue versus cost
* Cost per unit
* Shift forecast
* Planned versus expected margin
* Cost breakdown
* Assumptions drawer

## 14. Create one Trigger.dev chat agent

* Use one chat agent for all roles.
* Send every user question through the same agent.
* Identify the selected user role.
* Understand what the user is asking.
* Identify the relevant plant area.
* Identify the required time range.
* Select the required ClickHouse investigations.
* Run independent checks together.
* Combine the findings.
* Return the correct visual response.
* Keep the conversation available for follow-up questions.

## 15. Show the investigation happening live

Do not use one generic loading spinner.

For the engineer, show:

* Reading current equipment states
* Checking turbine values
* Checking generator output
* Comparing normal ranges
* Reviewing recent trends
* Building the engineering view

For operations, show:

* Calculating shift production
* Comparing with the target
* Checking plant capacity
* Finding the limiting process
* Forecasting shift completion
* Building the operations view

For finance, show:

* Calculating production value
* Applying operating costs
* Calculating cost per unit
* Forecasting revenue
* Comparing with plan
* Building the finance view

Show each check completing separately.

## 16. Create controlled visual blocks

Build a small set of reliable visual components:

* Plant process view
* Equipment faceplate
* Live value card
* Trend chart
* Normal-range comparison
* Production gauge
* Shift forecast
* Cost breakdown
* Revenue-versus-cost view
* Evidence card
* Assumptions card

Let the agent decide:

* Which blocks are needed
* Which data belongs in each block
* Which block should appear first

Do not allow completely random layouts.

## 17. Build the application

* Use one main page.
* Add the PlantOS name.
* Show the plant is live.
* Show the latest data timestamp.
* Show the current production rate.
* Add role buttons:

  * Engineer
  * Operations
  * Finance
* Add one chat input.
* Add suggested questions.
* Render the visual answer inside the conversation.
* Show Trigger.dev progress.
* Add an evidence drawer.
* Add a business-assumptions drawer.
* Add a ClickHouse proof section.
* Keep the design clean.
* Avoid unnecessary pages and tabs.

## 18. Test the engineer flow

* Start the live plant replay.
* Confirm the values are changing.
* Select Engineer.
* Ask about the current generators and turbine.
* Confirm several investigations run.
* Confirm the correct equipment is selected.
* Confirm live values match ClickHouse.
* Confirm trends use the correct time range.
* Confirm the plant view is understandable.
* Open one evidence item.
* Confirm it shows the supporting raw data.

## 19. Test the operations flow

* Keep the same running plant.
* Select Operations.
* Ask whether the plant will meet the shift target.
* Confirm production is calculated correctly.
* Confirm the forecast updates with new live data.
* Confirm the limiting process is based on plant data.
* Confirm actual and target values are clearly separated.
* Open the assumptions.
* Confirm the result can be explained.

## 20. Test the finance flow

* Keep the same running plant.
* Select Finance.
* Ask about today’s value and cost.
* Confirm production comes from the same live data.
* Confirm financial assumptions are clearly marked.
* Confirm revenue, cost, and margin calculations.
* Confirm the finance response looks different from the engineering response.
* Confirm values update as the plant continues running.

## 21. Test follow-up questions

Engineer:

* Compare this hour with the previous hour.
* Show only generator information.
* Which value is closest to its limit?
* Show the supporting data.

Operations:

* What happens if the current rate continues?
* Which process is limiting production?
* Compare this shift with the previous shift.
* How far are we from the target?

Finance:

* What will the shift be worth at the current rate?
* What is the cost per unit?
* Which process has the highest operating cost?
* Which assumption affects the forecast most?

The existing visual should update instead of returning only text.

## 22. Keep the project truthful

* State that HAI is an industrial-control testbed dataset.
* State that normal HAI data powers the live plant replay.
* Clearly mark synthetic production and cost assumptions.
* Do not claim the system controls equipment.
* Do not allow plant commands.
* Do not allow alarm acknowledgements.
* Do not claim financial figures are real company data.
* Keep every conclusion linked to its source or assumption.

## 23. Add a fallback demo mode

* Save one successful normal-operation replay.
* Save the main demo questions.
* Save the expected response data.
* Keep a recent preloaded data window.
* Allow the demo to work without the live replay.
* Use live mode when stable.
* Use fallback mode only when needed.

## 24. Record a rough demo early

* Record the full flow once all three roles work.
* Check whether the story is immediately understandable.
* Remove unnecessary clicks.
* Remove confusing labels.
* Fix slow transitions.
* Make the role differences visually obvious.
* Keep the final demo under five minutes.

## 25. Prepare the repository

* Keep the repository public.
* Add the MIT license.
* Explain the problem.
* Explain the HAI dataset.
* Explain the live replay.
* Explain ClickHouse usage.
* Explain Trigger.dev usage.
* Explain the engineer view.
* Explain the operations view.
* Explain the finance view.
* Explain which data is synthetic.
* Add the architecture diagram.
* Add screenshots.
* Add the demo link.

## 26. Prepare the final video

Demo order:

* Open directly on the live PlantOS screen.
* Show plant values changing.
* Ask the engineer question.
* Show the live investigation and engineering interface.
* Ask the operations question.
* Show target progress and shift forecast.
* Ask the finance question.
* Show production value, cost, and margin.
* Open one evidence item.
* Show the ClickHouse row count and query time.
* Briefly show the Trigger.dev run.
* End with the product thesis.

Final message:

**One running plant. One live data layer. A different interface for every decision.**

## 27. Submit the core project

Before adding anything else:

* Confirm the live app works.
* Confirm all three roles work.
* Confirm ClickHouse data is real.
* Confirm Trigger.dev usage is visible.
* Confirm the repository is public.
* Confirm the license is included.
* Confirm the final video is uploaded.
* Complete the submission form.
* Verify the submission was received.

## Stretch features

Only after submission is safe:

* Add maintenance or electrician role.
* Add abnormal-condition investigation.
* Add work-order creation.
* Add Postgres for a real operational write.
* Add more flexible visual composition.
* Add more plant areas.

## Final MVP test

The project is complete when:

* HAI normal plant data is stored in ClickHouse.
* The data is replayed continuously as live plant data.
* New values appear on the screen and in ClickHouse.
* One Trigger.dev agent handles all questions.
* The engineer sees equipment condition.
* Operations sees production performance.
* Finance sees value and cost.
* Every answer comes from the same running plant.
* Every calculation is traceable.
* The application remains simple and stable.

**One plant. One truth. Different intelligence for every role.**
