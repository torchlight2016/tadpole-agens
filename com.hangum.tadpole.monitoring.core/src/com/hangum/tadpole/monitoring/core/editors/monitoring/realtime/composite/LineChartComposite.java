package com.hangum.tadpole.monitoring.core.editors.monitoring.realtime.composite;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.log4j.Logger;
import org.eclipse.rap.chartjs.Chart;
import org.eclipse.rap.chartjs.ChartOptions;
import org.eclipse.rap.chartjs.ChartRowData;
import org.eclipse.rap.chartjs.ChartStyle;
import org.eclipse.swt.SWT;
import org.eclipse.swt.graphics.RGB;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.widgets.Composite;

import com.hangum.tadpole.sql.dao.system.monitoring.MonitoringResultDAO;

import org.eclipse.swt.layout.GridLayout;

/**
 * line chart
 * 
 * @author hangum
 *
 */
public class LineChartComposite extends AbstractTadpoleChart {
	private static final Logger logger = Logger.getLogger(LineChartComposite.class);
	
	private Chart chart;
	private ChartRowData chartRowData;
	private ChartOptions options;
	
	/** Each DB Color list */
	private Map<Integer, RGB> dbColorList;
	
	/** key is db seq */
	private Map<String, int[]> mapChartRowData = new HashMap<>();
	
	/** Chart of last value */
	private Map<String, Integer> mapLastValue = new HashMap<>(); 
	
	/** chart style */
	private Map<String, ChartStyle> mapChartStyle = new HashMap<>();

	/**
	 * Create the composite.
	 * @param parent
	 * @param dbColorList
	 * @param strGroupTitle
	 */
	public LineChartComposite(Composite parent, Map<Integer, RGB> dbColorList, String strGroupTitle) {
		super(parent, SWT.NONE, strGroupTitle);
		this.setText(strGroupTitle);
		
		this.dbColorList = dbColorList;
		
		Composite composite = new Composite(this, SWT.NONE);
		composite.setLayoutData(new GridData(SWT.FILL, SWT.FILL, true, true, 1, 1));
		composite.setLayout(new GridLayout(1, false));

		chart = new Chart(composite, SWT.NONE);
		chart.setLayoutData(new GridData(SWT.FILL, SWT.FILL, true, true));
		
		chartRowData = new ChartRowData(ThreeMinuteChartLabel);
		options = new ChartOptions();
		options.setAnimation(false);
		options.setShowFill(false);
		
		chart.drawLineChart(chartRowData, options);
	}

	/**
	 * redrew graphic
	 * 
	 * @param listNetworkMonitoringResult
	 */
	public void addRowData(final List<MonitoringResultDAO> listNetworkMonitoringResult, boolean isLastValueMinus) {

		chartRowData = new ChartRowData(ThreeMinuteChartLabel);
		for(MonitoringResultDAO monitoringResultDAO : listNetworkMonitoringResult) {
			String key = monitoringResultDAO.getDb_seq() + ":" + monitoringResultDAO.getMonitoring_index_seq() + ":"+ monitoringResultDAO.getMonitoring_type();
			int dblValue = Integer.parseInt(monitoringResultDAO.getIndex_value());
			
			logger.info("==================================================================");
			logger.info("===========>[key] " + key + "\t[value]" + dblValue);
			logger.info("==================================================================");
			
			int[] arryInt = mapChartRowData.get(key);
			if(arryInt == null) {
				RGB rgb = dbColorList.get(monitoringResultDAO.getDb_seq());
				ChartStyle cs = new ChartStyle(rgb.red, rgb.green, rgb.blue, 0.9f);
				mapChartStyle.put(key, cs);
	
				int[] arryChartData = new int[ThreeMinuteChartLabel.length];	
				mapChartRowData.put(key, arryChartData);
			}
			
			int[] rowArrData = mapChartRowData.get(key);
			System.arraycopy(rowArrData, 1, rowArrData, 0, rowArrData.length - 1);
			
			if(isLastValueMinus) {
				int intLastValue = mapLastValue.get(key) == null?0:mapLastValue.get(key);
				if(intLastValue != 0 ) {
					dblValue = dblValue - intLastValue; 
					rowArrData[rowArrData.length-1] = dblValue;
				}
			} else {
				rowArrData[rowArrData.length-1] = dblValue;
			}
			
			chartRowData.addRow(rowArrData, mapChartStyle.get(key));
			mapLastValue.put(key, dblValue);
		}
		
		chart.clear();
		chart.drawLineChart(chartRowData, options);
	}
	
}
