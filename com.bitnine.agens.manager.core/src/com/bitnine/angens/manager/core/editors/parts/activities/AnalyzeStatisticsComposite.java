package com.bitnine.angens.manager.core.editors.parts.activities;

import java.util.List;

import org.apache.log4j.Logger;
import org.eclipse.jface.viewers.TableViewerColumn;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.Composite;

import com.bitnine.agens.manager.engine.core.AgensManagerSQLImpl;
import com.bitnine.agens.manager.engine.core.dao.domain.Instance;
import com.bitnine.angens.manager.core.editors.parts.AgensTableComposite;
import com.bitnine.angens.manager.core.editors.parts.lableprovider.AgensMAPLabelProvider;
import com.hangum.tadpole.engine.query.dao.system.UserDBDAO;

/**
 * Analyze Statistics composite
 * 
 * @author hangum
 *
 */
public class AnalyzeStatisticsComposite extends AgensTableComposite {
	private static final Logger logger = Logger.getLogger(AnalyzeStatisticsComposite.class);
	
	/**
	 * Create the composite.
	 * @param parent
	 * @param title
	 * @param userDB
	 * @param instance
	 */
	public AnalyzeStatisticsComposite(Composite parent, UserDBDAO userDB, Instance instance, AgensMAPLabelProvider labelProvider) {
		super(parent, "Analyze Statistics", userDB, instance, labelProvider);
	}
	
	/**
	 * get cpu data
	 * @return
	 * @throws Exception
	 */
	public List<?> getUIData() throws Exception {
		return AgensManagerSQLImpl.getSQLMapQueryInfo(userDB, "analyze_statistics25", getRangeSnapId());
	}
	
	/**
	 * make columns
	 */
	public void createTableColumn() {
		String[] columnName = {"database", "schema", "table", "count", "total duration (sec)", "avg duration (sec)", "max duration (sec)"};
		int[] columnSize = {100, 100, 100, 80, 80, 80, 80};
		int[] align = {SWT.LEFT, SWT.LEFT, SWT.LEFT, SWT.RIGHT, SWT.RIGHT, SWT.RIGHT, SWT.RIGHT};
		
		for(int i=0; i<columnName.length; i++) {
			final TableViewerColumn tableColumn = new TableViewerColumn(tableView, align[i]);
			tableColumn.getColumn().setText(columnName[i]);
			tableColumn.getColumn().setWidth(columnSize[i]);
			tableColumn.getColumn().setAlignment(columnSize[i]);
			tableColumn.getColumn().setResizable(true);
			tableColumn.getColumn().setMoveable(false);
		}
	}
}